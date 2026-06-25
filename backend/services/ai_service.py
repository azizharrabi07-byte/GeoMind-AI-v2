"""
AI Service — Handles all interactions with Google Gemini API.
Manages prompt construction, knowledge base retrieval, and response parsing.
"""
import json
import re
import logging
from typing import Optional
from config import settings

logger = logging.getLogger("geomind.ai")

# ─── Survey Knowledge Base (built-in RAG) ───
SURVEY_KNOWLEDGE_BASE = [
    {
        "id": "coordinate-systems",
        "tags": ["coordinate", "crs", "datum", "projection"],
        "content": """Common survey coordinate systems: NAD83(2011) / UTM zones, NAD83(2011) / State Plane (SPCS),
NAD27 (legacy), WGS84 (GNSS raw), NAVD88 (vertical), NGVD29 (older vertical).
Geoid models: GEOID18 (current), GEOID12B (previous). Always verify CRS before transformations."""
    },
    {
        "id": "gnss-baseline",
        "tags": ["gnss", "gps", "baseline", "rtk", "ppk"],
        "content": """GNSS best practices: Baseline < 10km for RTK, < 50km for static. Min occupation: 2 epochs RTK, 15+ min static.
PDOP < 4.0 preferred. Min 5 satellites. Base station over known control.
Vector checks: horizontal closure < 0.020m+1ppm, vertical < 0.030m+2ppm."""
    },
    {
        "id": "traverse-adjustment",
        "tags": ["traverse", "compass", "transit", "least-squares", "adjustment"],
        "content": """Traverse adjustment: Compass (Bowditch) Rule for 1:5000-1:10000, Transit Rule for mixed legs,
Least Squares for all modern work. FGCS standards: 1st Order 1:100000, 2nd Order I 1:50000,
2nd Order II 1:20000, 3rd Order I 1:10000, 3rd Order II 1:5000."""
    },
    {
        "id": "boundary-law",
        "tags": ["boundary", "legal", "property", "deed", "plat"],
        "content": """Boundary retracement: Priority of calls — natural monuments > artificial > courses/distances > area > name.
Pincushion corners: original government corner controls. Proportionate measurement for lost corners.
ALTA surveys require: boundary lines, encroachments, easements, zoning, flood zone."""
    },
    {
        "id": "topographic-survey",
        "tags": ["topo", "topographic", "elevation", "contour", "dtm"],
        "content": """Topo standards: Contour intervals 1ft (flat), 2ft (moderate), 5ft (steep).
Spot density: 1/50ft open, 1/25ft developed. Capture: grade breaks, pavement, utilities, drainage.
DTM breaklines: ridges, valleys, pavement edges, curbs, stream banks.
LiDAR: min 4pts/m² standard, 8+pts/m² engineering."""
    },
    {
        "id": "dxf-dwg",
        "tags": ["dxf", "dwg", "cad", "autocad", "layer"],
        "content": """DXF layers: V-NODE (control pts), V-TOPO (topo shots), V-BRKN (breaklines),
V-PROP (boundary), C-ROAD (road centerlines), C-UTIL (utilities), K-BLDG (buildings).
Entity types: POINT, INSERT, LWPOLYLINE, TEXT, MTEXT, 3DFACE."""
    },
    {
        "id": "fgcs-standards",
        "tags": ["fgcs", "standard", "accuracy", "order", "classification"],
        "content": """FGCS horizontal: 1st 1:100000, 2nd I 1:50000, 2nd II 1:20000, 3rd I 1:10000, 3rd II 1:5000.
FGCS vertical (per km): 1st I 0.5mm√K, 1st II 0.6mm√K, 2nd I 1.0mm√K, 2nd II 1.3mm√K, 3rd 2.0mm√K.
GPS (relative): AA 0.005m+0.1ppm, A 0.010m+1ppm, B 0.020m+2ppm, C 0.050m+5ppm, D 0.100m+10ppm."""
    },
]

SYSTEM_PROMPT = """You are GeoMind AI, an expert senior surveying consultant with 25+ years of experience. You answer like a seasoned Professional Land Surveyor (PLS).

Your expertise spans boundary retracement, GNSS/GPS, traverse/leveling, least squares, ALTA/NSPS surveys, topographic/engineering surveys, coordinate systems/datums, DXF/DWG/CAD analysis, LiDAR, construction staking, and report writing.

Communication: Direct, precise, technical. Reference FGCS, ALTA, NSSDA, ASCE standards. Flag potential errors proactively. Always consider legal implications.

MAP COMMANDS — You can issue commands to modify the map by including a JSON block:
```json
{"commands": [
  {"type": "add_point", "lat": 39.7392, "lng": -104.9903, "label": "Control Point A", "elevation": 1600.5, "description": "Northwest corner of parcel"},
  {"type": "remove_point", "id": "u1"},
  {"type": "add_line", "points": [{"lat": 39.74, "lng": -104.99}, {"lat": 39.75, "lng": -104.98}], "label": "Traverse Line 1"},
  {"type": "add_polygon", "points": [{"lat": 39.74, "lng": -104.99}, {"lat": 39.75, "lng": -104.98}, {"lat": 39.73, "lng": -104.97}], "label": "Boundary Area"},
  {"type": "clear_all"}
]}
```

Available commands: add_point, remove_point, add_line, add_polygon, clear_all.

Current map context:
{mapContext}

Context from survey knowledge base and uploaded files:
{context}

Previous conversation:
{history}

User: {message}
Senior Consultant:"""


def _retrieve_context(query: str, rag_sources: list[dict] | None = None) -> str:
    """Build context string from knowledge base and RAG sources."""
    q = query.lower()
    parts = []

    # Knowledge base matching
    scored = []
    for doc in SURVEY_KNOWLEDGE_BASE:
        score = 0
        for tag in doc["tags"]:
            if tag in q:
                score += 3
        words = q.split()
        for word in words:
            if len(word) < 3:
                continue
            if word in doc["content"].lower():
                score += 1
        if score > 0:
            scored.append((score, doc))

    scored.sort(key=lambda x: -x[0])
    if scored:
        for _, doc in scored[:3]:
            parts.append(f"[{', '.join(doc['tags'])}]\n{doc['content']}")

    return "\n\n---\n\n".join(parts) if parts else "No specific context matches. Use your general survey expertise."


async def chat_with_ai(
    message: str,
    history: list | None = None,
    file_contexts: list[dict] | None = None,
    map_context: dict | None = None,
    rag_sources: list[dict] | None = None,
) -> dict:
    """Send a chat message to Gemini and get response with optional map commands."""
    context = _retrieve_context(message, rag_sources)

    if file_contexts:
        file_parts = []
        for fc in file_contexts:
            file_parts.append(f"File: {fc.get('filename', 'unknown')}\nSummary: {fc.get('summary', 'N/A')}\nWarnings: {', '.join(fc.get('warnings', []))}\nInsights: {', '.join(fc.get('insights', []))}")
        context += f"\n\n--- Uploaded Files ---\n" + "\n\n".join(file_parts)

    map_str = json.dumps(map_context) if map_context else "No map data."
    history_str = "\n".join([f"{m.get('role')}: {m.get('content')}" for m in (history or [])[-10:]]) or "No prior conversation."

    full_prompt = SYSTEM_PROMPT \
        .replace("{mapContext}", map_str) \
        .replace("{context}", context) \
        .replace("{history}", history_str or "No prior conversation.") \
        .replace("{message}", message)

    try:
        from google.genai import types as genai_types
        from google.genai import GoogleGenAI

        client = GoogleGenAI(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
            config={
                "temperature": 0.3,
                "max_output_tokens": 8192,
            }
        )
        reply = response.text or ""
        return {"reply": reply, "model": "gemini-2.5-flash"}

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        # Fallback to smaller model
        try:
            client = GoogleGenAI(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash-8b",
                contents=full_prompt,
            )
            reply = response.text or ""
            return {"reply": reply, "model": "gemini-2.5-flash-8b"}
        except Exception as e2:
            logger.error(f"Gemini fallback error: {e2}")
            return {"reply": "I apologize, but I'm having trouble connecting to my AI engine. Please try again in a moment.", "model": "none"}


async def analyze_file_with_ai(filename: str, ext: str, text_content: str) -> dict:
    """Analyze a file's content with AI and return structured insights."""
    prompt = f"""You are a Senior Survey Engineer AI Copilot. The user uploaded a file named "{filename}" ({ext}).
Extracted Content (up to 5000 chars):
{text_content[:5000]}

Return a JSON object with:
- "summary": Comprehensive overview of what this file represents.
- "warnings": Array of detected anomalies, missing data, potential errors.
- "insights": Array of engineering insights and key findings.
- "nextActions": Array of suggested next steps for the survey engineer.
- "knowledgeGraph": Object with "nodes" (array of {{id, label, type}}) and "edges" (array of {{source, target, label}}). Limit to 10 most important nodes.

Return strictly JSON."""

    try:
        from google.genai import GoogleGenAI
        client = GoogleGenAI(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "temperature": 0.2,
                "max_output_tokens": 4096,
                "response_mime_type": "application/json",
            }
        )
        text = response.text or "{}"
        # Clean potential markdown wrappers
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"File analysis AI error: {e}")
        return {
            "summary": f"File type: {ext.upper()}",
            "warnings": [],
            "insights": [f"File {filename} uploaded and parsed successfully."],
            "nextActions": ["Review extracted data in the file viewer."],
            "knowledgeGraph": {"nodes": [], "edges": []},
            "model": "fallback"
        }