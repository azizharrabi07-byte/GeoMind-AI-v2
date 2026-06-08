// @ts-nocheck
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
import fs from "fs";

/* ─── Extraction Libraries ─── */
import { PDFParse as pdfParse } from "pdf-parse";
import XLSX from "xlsx";

/* ─── Gemini SDK ─── */
import { GoogleGenAI } from "@google/genai";
import Tesseract from "tesseract.js";

/* ─── Config ─── */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* ─── File Upload Config ─── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

/* ─── Extracted File Content Store ─── */
const fileStore = new Map();

/* ─── DXF Text Parser ─── */
function parseDXFText(buf) {
  const text = buf.toString("utf-8");
  const lines = text.split(/\r?\n/);
  const layers = new Set();
  const entities = [];
  const coords = [];
  let currentEntity = null;
  let currentLayer = "0";

  for (let i = 0; i < lines.length; i++) {
    const code = lines[i].trim();
    const val = lines[i + 1]?.trim();
    if (code === "0" && val) {
      if (currentEntity) entities.push(currentEntity);
      currentEntity = { type: val, layer: currentLayer };
    } else if (code === "8" && val) {
      currentLayer = val;
      layers.add(val);
      if (currentEntity) currentEntity.layer = val;
    } else if (code === "10" && val) {
      const x = parseFloat(val);
      const y = parseFloat(lines[i + 2]?.trim() || "0");
      const z = parseFloat(lines[i + 4]?.trim() || "0");
      if (!isNaN(x) && !isNaN(y)) coords.push({ x, y, z });
    } else if (code === "2" && val && currentEntity?.type === "LAYER") {
      layers.add(val);
    }
  }
  if (currentEntity) entities.push(currentEntity);

  return {
    layers: [...layers],
    entityTypes: [...new Set(entities.map((e) => e.type))].filter(Boolean),
    entityCount: entities.length,
    coordCount: coords.length,
    coords: coords.slice(0, 100),
    text: `DXF file with ${entities.length} entities across ${layers.size} layers. Layers: ${[...layers].join(", ")}. Entity types: ${[...new Set(entities.map((e) => e.type))].filter(Boolean).join(", ")}.`,
  };
}

/* ─── Extract text from uploaded file ─── */
async function extractFileContent(filename, buffer) {
  const ext = filename.split(".").pop().toLowerCase();
  const result = { ext, size: buffer.length, text: "", metadata: {} };

  try {
    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      result.text = data.text || "";
      result.metadata = { pages: data.numpages, version: data.info?.PDFFormatVersion };
    } else if (ext === "xlsx" || ext === "xls") {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const texts = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length > 0) {
          texts.push(`Sheet: ${sheetName}`);
          texts.push(`Columns: ${rows[0].join(", ")}`);
          texts.push(`Rows: ${rows.length - 1}`);
          texts.push(rows.slice(0, 50).map((r) => r.join(", ")).join("\n"));
        }
      }
      result.text = texts.join("\n\n");
      result.metadata = { sheets: wb.SheetNames.length, sheetNames: wb.SheetNames };
    } else if (ext === "csv") {
      const csvText = buffer.toString("utf-8");
      const lines = csvText.split("\n").filter(Boolean);
      const headers = lines[0]?.split(",").map((h) => h.trim()) || [];
      result.text = csvText;
      result.metadata = { headers, rowCount: lines.length - 1 };
    } else if (ext === "dxf") {
      const parsed = parseDXFText(buffer);
      result.text = parsed.text;
      result.metadata = {
        layers: parsed.layers,
        entityTypes: parsed.entityTypes,
        entityCount: parsed.entityCount,
        coordCount: parsed.coordCount,
      };
    } else if (ext === "geojson" || ext === "json") {
      const jsonText = buffer.toString("utf-8");
      let json;
      try {
        json = JSON.parse(jsonText);
      } catch {
        json = null;
      }
      if (json) {
        const features = json.features || [];
        const types = [...new Set(features.map((f) => f.geometry?.type).filter(Boolean))];
        const props = features[0]?.properties ? Object.keys(features[0].properties) : [];
        result.text = `GeoJSON with ${features.length} features. Types: ${types.join(", ")}. Properties: ${props.join(", ")}`;
        result.metadata = { featureCount: features.length, geometryTypes: types, properties: props };
      } else {
        result.text = jsonText;
      }
    } else if (["png", "jpg", "jpeg", "tiff", "tif", "bmp", "webp"].includes(ext)) {
        const { data } = await Tesseract.recognize(buffer, "eng", {
          logger: (m) => m.status === "recognizing text" && console.log(`OCR: ${Math.round(m.progress * 100)}%`),
        });
        result.text = data.text || "";
        result.metadata = { ocr: true, confidence: data.confidence, lines: data.lines?.length || 0, words: data.words?.length || 0 };
    } else {
        result.text = buffer.toString("utf-8");
      }
  } catch (err) {
    result.error = err.message;
    result.text = `[Extraction error: ${err.message}]`;
  }

  return result;
}

/* ─── AI Provider Manager ─── */
function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const tryGemini = async (model, promptText, jsonMode = false) => {
  try {
    const ai = getGeminiClient();
    const config = {
      temperature: 0.3,
      maxOutputTokens: 8192,
    };
    if (jsonMode) {
      config.responseMimeType = "application/json";
    }
    const response = await ai.models.generateContent({
      model: model,
      contents: promptText,
      config: config
    });
    return response.text || (jsonMode ? "{}" : "I apologize, I couldn't generate a response.");
  } catch (err) {
    console.error(`Gemini API error (${model}):`, err.message);
    return null;
  }
};

/* ─── Survey Knowledge Base (built-in RAG) ─── */
const KNOWLEDGE_BASE = [
  {
    id: "coordinate-systems",
    tags: ["coordinate", "crs", "datum", "projection"],
    content: `Common survey coordinate systems in the US:
• NAD83(2011) / UTM zones — most common for GIS and engineering surveys
• NAD83(2011) / State Plane Coordinate System (SPCS) — used for legal boundary and ALTA surveys
• NAD27 — legacy system, still found in older plats and deeds
• WGS84 — used for GPS/GNSS raw data collection
• NAVD88 — vertical datum for orthometric heights
• NGVD29 — older vertical datum, 0.5-1.5 ft difference vs NAVD88 depending on region
• Geoid models: GEOID18 (current), GEOID12B (previous) — convert ellipsoidal height to orthometric

Always verify the coordinate system of source data before performing calculations or transformations. Mixing datums is the #1 source of error in survey workflows.`,
  },
  {
    id: "gnss-baseline",
    tags: ["gnss", "gps", "baseline", "rtk", "ppk", "observation"],
    content: `GNSS survey best practices:
• Baseline length should not exceed 10 km for RTK, 50 km for static post-processing
• Minimum occupation time: 2 epochs × 1 second for RTK, 15+ minutes for static depending on baseline length
• PDOP should be below 4.0 for reliable measurements; below 6.0 acceptable for less critical work
• Minimum 5 satellites tracked simultaneously (GPS + GLONASS preferred)
• Base station should be set up over a known control point with published coordinates
• Vector checks: horizontal closure < 0.020m + 1ppm, vertical closure < 0.030m + 2ppm
• Loop misclosures should be checked before final adjustment
• Use OPUS for post-processing when accuracy requirements exceed RTK capabilities`,
  },
  {
    id: "traverse-adjustment",
    tags: ["traverse", "compass", "transit", "least-squares", "adjustment"],
    content: `Traverse adjustment methods:
• Compass (Bowditch) Rule: Distributes error proportionally by horizontal distance. Suitable for open traverses with accuracy 1:5,000 to 1:10,000.
• Transit Rule: Distributes error proportionally by latitude and longitude. Better for traverses with mixed short and long legs.
• Least Squares Adjustment: Preferred for all modern work. Handles redundant observations, provides statistical analysis of residuals, and can weight observations by their estimated precision.
• Minimum standards (FGCS): 
  - First Order: 1:100,000
  - Second Order Class I: 1:50,000
  - Second Order Class II: 1:20,000
  - Third Order Class I: 1:10,000
  - Third Order Class II: 1:5,000
• Angular closure should not exceed: First Order: 1.7" √N, Second Order I: 3" √N, Second Order II: 4.5" √N, Third Order: 10" √N where N = number of stations`,
  },
  {
    id: "boundary-law",
    tags: ["boundary", "legal", "property", "deed", "plat", "corner"],
    content: `Boundary retracement principles:
• Priority of calls in a deed: natural monuments > artificial monuments > courses and distances > area > name calls
• Pincushion corners: when multiple monuments exist at a corner location, the original government corner controls over all subsequent surveys
• Proportionate measurement: when original corners are lost, remeasure between remaining original corners proportionally
• ALTA/NSPS Land Title Surveys require: boundary lines measured, encroachments shown, easements identified, zoning verification, flood zone determination
• Record vs actual: differences between deed dimensions and field measurements must be resolved through proper evidence evaluation, not simply forcing closure
• Ambigious descriptions should be interpreted against the grantor
• Senior rights: the first deed conveyed has senior rights over later conveyances`,
  },
  {
    id: "topographic-survey",
    tags: ["topo", "topographic", "elevation", "contour", "dtm"],
    content: `Topographic survey standards:
• Contour intervals: 1 ft for flat terrain (0-5% slope), 2 ft for moderate (5-15%), 5 ft for steep (>15%)
• Spot shot density: minimum 1 shot per 50 ft in open areas, 1 per 25 ft in developed areas
• Critical features to capture: grade breaks (top/bottom of slopes), pavement edges, utility structures, drainage patterns, tree lines, building foundations
• DTM breaklines: collect along ridges, valleys, edges of pavement, top/bottom of walls, curb lines, and stream banks for accurate TIN modeling
• LiDAR point density: minimum 4 points/m² for standard topo, 8+ points/m² for detailed engineering design
• Accuracy standards: NSSDA vertical accuracy should be tested at 95% confidence level
• Check shots: minimum 10% of points should be check shots on hard surfaces for quality control`,
  },
  {
    id: "dxf-dwg",
    tags: ["dxf", "dwg", "cad", "autocad", "layer", "entity"],
    content: `DXF/DWG file structure for survey data:
• Common layer naming conventions: 
  - V-NODE — control points / monuments
  - V-TOPO — topo spot shots
  - V-BRKN — breaklines / TIN edges
  - V-PROP — property/boundary lines  
  - C-ROAD — road centerlines
  - C-UTIL — utilities
  - K-BLDG — building footprints
• Entity types commonly found in survey DWGs: POINT, INSERT (block), LWPOLYLINE, POLYLINE, TEXT, MTEXT, 3DFACE, BLOCK
• Civil 3D survey databases are stored separately and linked to the DWG via the Survey Toolspace tab
• Coordinate system is embedded in the DWG's GEOCS marker — always verify before extraction
• Layer 0 entities should not be relied upon for data extraction — they inherit color/linetype from the block insertion`,
  },
  {
    id: "file-formats",
    tags: ["csv", "raw", "las", "laz", "file", "jxl", "format"],
    content: `Survey file format standards:
• RAW files (GNSS): typically contain raw observation data in vendor-specific formats. Common formats: .raw (Trimble), .jps (Javad), .tps (Topcon), .rw5 (Carlson). Each record contains epoch time, satellite IDs, carrier phase, and code range observations.
• CSV survey data: Column headers should include PointID, Northing, Easting, Elevation, Code/Description, and optional attributes. Lat/Lon in decimal degrees is preferred for web applications.
• LAS/LAZ (LiDAR): LAS 1.4 is current standard. Point formats: 0 (base), 2 (with GPS time), 6 (extended). Classification codes: 2=ground, 6=building, 9=water, 10=rail. 
• DXF: ASCII DXF is preferred for interoperability. Key sections: HEADER (system variables), CLASSES, TABLES (layers, linetypes, text styles), BLOCKS, ENTITIES, OBJECTS.
• GeoJSON: For web GIS, use EPSG:4326 (WGS84 lon/lat). Feature collection with properties is the standard wrapper.
• GPX: For GPS tracks and waypoints. XML-based with trkpt/wpt elements containing lat, lon, ele, time.`,
  },
  {
    id: "report-standards",
    tags: ["report", "boundary", "alta", "survey", "narrative"],
    content: `Professional survey report standards:
• Boundary Survey Report must include: record map, field notes summary, corner recovery/establishment methods, evidence evaluation, resolution of discrepancies, opinion of boundary location
• ALTA Survey Report must include: boundary description, surveyed property lines, easements, rights-of-way, encroachments, zoning classification, flood zone, access verification
• Topographic Survey Report: data collection methods, accuracy assessment (NSSDA), control network summary, surface model specifications, feature classification
• Construction Staking Report: control network, staking tolerances, as-built verification, final coordinates
• Every report should state: date of survey, surveyor's name and license number, coordinate system/datum, standards followed, field and office methods, limitations and qualifications`,
  },
  {
    id: "error-detection",
    tags: ["error", "blunder", "mistake", "check", "validation", "qa"],
    content: `Common survey errors and detection methods:
• GNSS blunders: cycle slip (detect via LLI indicators), bad ephemeris (check age), multipath (check SNR > 35 dB-Hz), antenna height (measure twice)
• Traverse blunders: gross angular error (check angle sum vs (n-2)×180°), distance error (check reciprocal measurements), wrong target (check foresight/backsight descriptions)
• Data entry errors: transposed digits (check 180° rule on bearings), wrong point code, elevation in feet vs meters
• Coordinate transformation errors: wrong datum parameters, incorrect grid-to-ground factors, false northing/easting applied
• Detection methods: redundant observations, control network checks, graphical analysis (plot points to visualize outliers), statistical testing (Baarda's data snooping, Tau criterion)
• Always check: instrument calibration certificates, temperature/pressure settings for EDM, prism constant values, rod bubble calibration`,
  },
  {
    id: "fgcs-standards",
    tags: ["fgcs", "standard", "accuracy", "order", "classification"],
    content: `FGCS (Federal Geodetic Control Subcommittee) Standards:
• Horizontal Accuracy: 
  - 1st Order: 1:100,000 (0.010m + 1ppm)
  - 2nd Order Class I: 1:50,000 (0.020m + 2ppm)  
  - 2nd Order Class II: 1:20,000 (0.050m + 5ppm)
  - 3rd Order Class I: 1:10,000 (0.100m + 10ppm)
  - 3rd Order Class II: 1:5,000 (0.200m + 20ppm)
• Vertical Accuracy (per km of leveled section):
  - 1st Order Class I: 0.5mm √K, Class II: 0.6mm √K
  - 2nd Order Class I: 1.0mm √K, Class II: 1.3mm √K
  - 3rd Order: 2.0mm √K
• GPS accuracy standards (relative positioning):
  - AA: 0.005m + 0.1ppm (geodetic control)
  - A: 0.010m + 1ppm (primary network)
  - B: 0.020m + 2ppm (secondary network)
  - C: 0.050m + 5ppm (local control)
  - D: 0.100m + 10ppm (GIS/reconnaissance)
• All survey work should clearly state the order/classification achieved`,
  },
];

/* ─── In-Memory Chunk Index ─── */
const chunkIndex = new Map();

function chunkText(text, maxLen = 512, overlap = 64) {
  if (!text || text.length < 10) return [];
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxLen - overlap) {
    const chunk = words.slice(i, i + maxLen).join(" ");
    if (chunk.length > 20) chunks.push(chunk);
  }
  return chunks;
}

function indexFileChunks(fileId, filename, text) {
  const chunks = chunkText(text);
  if (chunks.length === 0) return;
  const entries = chunks.map((t, i) => ({ fileId, filename, chunkIndex: i, text: t }));
  chunkIndex.set(fileId, entries);
}

function searchFileChunks(query, topK = 5) {
  const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (qWords.length === 0) return [];

  const scored = [];
  for (const [, entries] of chunkIndex) {
    for (const entry of entries) {
      const textLower = entry.text.toLowerCase();
      let score = 0;
      for (const word of qWords) {
        const idx = textLower.indexOf(word);
        if (idx !== -1) {
          score += 1 + (word.length / textLower.length) * 10;
          if (idx < 50) score += 2;
        }
      }
      if (score > 0) scored.push({ ...entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function removeFileChunks(fileId) {
  chunkIndex.delete(fileId);
}

/* ─── Context Retrieval (KB + File Chunks) ─── */
function retrieveContext(query, topK = 3) {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_BASE.map((doc) => {
    let score = 0;
    for (const tag of doc.tags) {
      if (q.includes(tag)) score += 3;
    }
    const words = q.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue;
      if (doc.content.toLowerCase().includes(word)) score += 1;
      if (doc.tags.some((t) => t.includes(word) || word.includes(t))) score += 2;
    }
    return { ...doc, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const kbContext = scored.slice(0, topK).filter((d) => d.score > 0);

  /* ─── Also search uploaded file chunks ─── */
  const fileChunks = searchFileChunks(query, 5);
  const fileContext = fileChunks.map((c) => ({
    source: "file",
    filename: c.filename,
    content: `[From uploaded file "${c.filename}"]\n${c.text}`,
  }));

  return { kb: kbContext, files: fileContext };
}

/* ─── Session Memory ─── */
const sessions = new Map();

function getSession(sessionId) {
  if (!sessionId) {
    sessionId = uuidv4();
  }
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { id: sessionId, messages: [], createdAt: new Date().toISOString() });
  }
  return sessions.get(sessionId);
}

/* ─── System Prompt ─── */
const SYSTEM_PROMPT = `You are GeoMind AI, an expert senior surveying consultant with 25+ years of experience. You answer like a seasoned Professional Land Surveyor (PLS).

Your expertise spans:
- Boundary retracement and legal principles
- GNSS/GPS observation and processing
- Conventional traverse, leveling, and triangulation
- Least squares adjustments and statistical analysis
- ALTA/NSPS Land Title Surveys
- Topographic and engineering surveys
- Coordinate systems, datums, and transformations
- DXF/DWG/CAD file analysis
- LiDAR point cloud processing
- Construction staking and as-built verification
- Survey report writing and standards

Communication style:
- Be direct, precise, and technical — use proper survey terminology
- Reference specific standards (FGCS, ALTA, NSSDA, ASCE) when giving recommendations
- When analyzing data, identify potential issues proactively before the user asks
- Use analogies to field work when explaining complex concepts
- If unsure, state your assumptions clearly and ask for clarification
- Always consider the legal implications of boundary decisions
- Provide actionable next steps, not just analysis
- Flag potential errors, discrepancies, and risk factors

When reviewing survey data:
1. First check coordinate system and datum consistency
2. Verify control network integrity
3. Look for common blunders (antenna heights, prism constants, rod bubble)
4. Evaluate precision against stated accuracy standards
5. Check for jurisdictional requirements

You have access to an interactive GIS map. The user can place survey points, draw lines, and draw polygons on the map. You can see what's on the map and you can modify it using structured commands.

MAP COMMANDS — You can issue commands in your response to modify the map. Put them in a JSON code block at the end of your response like this:
\`\`\`json
{"commands": [
  {"type": "add_point", "lat": 39.7392, "lng": -104.9903, "label": "Control Point A", "elevation": 1600.5, "description": "Northwest corner of parcel"},
  {"type": "remove_point", "id": "u1"},
  {"type": "add_line", "points": [{"lat": 39.74, "lng": -104.99}, {"lat": 39.75, "lng": -104.98}], "label": "Traverse Line 1"},
  {"type": "add_polygon", "points": [{"lat": 39.74, "lng": -104.99}, {"lat": 39.75, "lng": -104.98}, {"lat": 39.73, "lng": -104.97}], "label": "Boundary Area"},
  {"type": "clear_all"}
]}
\`\`\`

Available commands:
- add_point: Add a survey point at {lat, lng} with optional label, elevation, description
- remove_point: Remove point by id
- add_line: Draw a line from an array of {lat, lng} points
- add_polygon: Draw a polygon from an array of {lat, lng} points
- clear_all: Remove all user-drawn features

When the user asks for a survey report based on map data, generate a professional report with: project info, control network summary, boundary analysis, measurement results, and recommendations.

Current map context:
{mapContext}

Context from project knowledge base:
{context}

Previous conversation:
{history}

User: {message}

Senior Consultant:`;

/* ─── Express App ─── */
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ─── POST /api/chat ─── */
app.post("/api/chat", async (req, res) => {
  const { message, sessionId, projectContext, fileIds, mapContext } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const session = getSession(sessionId || req.headers["x-session-id"]);
  const currentSessionId = session.id;

  const ragResult = retrieveContext(message);
  let context = ragResult.kb.length > 0
    ? ragResult.kb.map((d) => `[${d.tags.join(", ")}]\n${d.content}`).join("\n\n---\n\n")
    : "No specific knowledge base matches. Use your general survey engineering expertise.";

  if (ragResult.files.length > 0) {
    context += `\n\n--- Uploaded File Context ---\n${ragResult.files.map((f) => f.content).join("\n\n---\n\n")}`;
  }

  /* ─── Include uploaded file context ─── */
  if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
    const fileContexts = fileIds
      .map((fid) => fileStore.get(fid))
      .filter(Boolean)
      .map((f) => {
        return `File "${f.filename}" (.${f.ext}):
AI Summary: ${f.summary || "N/A"}
Anomalies/Warnings: ${(f.warnings || []).join(", ")}
Insights: ${(f.insights || []).join(", ")}
Next Actions: ${(f.nextActions || []).join(", ")}
Knowledge Graph Nodes: ${JSON.stringify(f.knowledgeGraph?.nodes || [])}

Raw Extracted Text Snippet:
${(f.extractedText || "").slice(0, 3000)}`;
      });
    if (fileContexts.length > 0) {
      context += `\n\n--- Uploaded File Contexts and Analysis ---\n${fileContexts.join("\n\n---\n\n")}`;
    }
  }

  const projectCtx = projectContext
    ? `\nActive project context:\n${JSON.stringify(projectContext, null, 2)}`
    : "";

  const mapCtxStr = mapContext
    ? `\nCurrent GIS Map State:\n${JSON.stringify(mapContext, null, 2)}`
    : "\nCurrent GIS Map State: No map data available.";

  const history = session.messages.slice(-10).map((m) => `${m.role}: ${m.content}`).join("\n");

  const fullPrompt = SYSTEM_PROMPT
    .replace("{mapContext}", mapCtxStr)
    .replace("{context}", context + projectCtx)
    .replace("{history}", history || "No prior conversation.")
    .replace("{message}", message);

  const messages = [
    { role: "user", content: fullPrompt },
  ];

  let provider = "gemini";
  let reply;

  reply = await tryGemini("gemini-2.5-flash", fullPrompt);
  if (!reply) {
    provider = "gemini-fallback";
    reply = await tryGemini("gemini-2.5-flash-8b", message);
    if (!reply) {
      return res.status(500).json({
        error: "All AI providers exhausted. Please try again later.",
        provider: "none",
      });
    }
  }

  /* ─── Parse commands from AI response ─── */
  let commands = [];
  const jsonMatch = reply.match(/```json\s*({[\s\S]*?})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.commands && Array.isArray(parsed.commands)) {
        commands = parsed.commands;
        reply = reply.replace(jsonMatch[0], "").trim();
      }
    } catch (e) {
      console.error("Failed to parse AI commands:", e.message);
    }
  }

  session.messages.push({ role: "user", content: message });
  session.messages.push({ role: "assistant", content: reply });

  res.json({
    reply,
    commands: commands.length > 0 ? commands : undefined,
    sessionId: currentSessionId,
    provider,
    ragSources: ragResult.kb.map((d) => ({ id: d.id, tags: d.tags })),
    fileChunksUsed: ragResult.files.map((f) => ({ filename: f.filename })),
    fileContextUsed: (fileIds || []).filter((fid) => fileStore.has(fid)).length,
  });
});

/* ─── GET /api/session/:id ─── */
app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

/* ─── DELETE /api/session/:id ─── */
app.delete("/api/session/:id", (req, res) => {
  sessions.delete(req.params.id);
  res.json({ ok: true });
});

/* ─── POST /api/analyze (multipart with real extraction) ─── */
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded. Use multipart/form-data with field 'file'." });

  const { originalname, buffer, size, mimetype } = req.file;
  const ext = originalname.split(".").pop().toLowerCase();

  const extraction = await extractFileContent(originalname, buffer);
  const fileId = uuidv4();

  const analysis = {
    fileId,
    filename: originalname,
    ext,
    size,
    mimetype,
    summary: "Analyzing...",
    warnings: [],
    insights: [],
    nextActions: [],
    knowledgeGraph: { nodes: [], edges: [] },
    extractedText: extraction.text.slice(0, 5000),
    metadata: extraction.metadata,
  };

  const aiPrompt = `You are a Senior Survey Engineer AI Copilot. The user uploaded a file named "${originalname}" (${ext}).
Extracted Content/Metadata (up to 5000 chars):
${extraction.text.slice(0, 5000)}

Please analyze this file and return a JSON object with the following fields:
- "summary": A very easy to understand, comprehensive overview of what this file is, what it represents in the project, and any key facts.
- "warnings": An array of strings representing detected anomalies, missing data, potential errors, or risks (e.g. "Coordinate system not detected", "Large gap in contour lines").
- "insights": An array of strings representing engineering insights, key findings, or valuable deductions from the data.
- "nextActions": An array of strings suggesting logical next steps for the survey engineer based on this file.
- "knowledgeGraph": An object containing "nodes" (array of { id, label, type }) and "edges" (array of { source, target, label }) representing the conceptual knowledge map of the project as understood from this file. types could be "file", "entity", "attribute", "coordinate", "layer", etc. Limit to most important 10 nodes.

Return strictly a JSON object matching this schema.`;

  const aiResult = await tryGemini("gemini-2.5-flash", aiPrompt, true) || "{}";
  try {
    const aiData = JSON.parse(aiResult);
    analysis.summary = aiData.summary || `File type: ${ext.toUpperCase()}`;
    analysis.warnings = aiData.warnings || [];
    analysis.insights = aiData.insights || [];
    analysis.nextActions = aiData.nextActions || [];
    if (aiData.knowledgeGraph) {
      analysis.knowledgeGraph = aiData.knowledgeGraph;
    }
  } catch (err) {
    console.error("Failed to parse AI file analysis", err);
    analysis.summary = `Failed to parse AI analysis. Raw text size: ${extraction.text.length}`;
  }

  /* ─── Store extracted content for chat context ─── */
  fileStore.set(fileId, {
    fileId,
    filename: originalname,
    ext,
    extractedText: extraction.text,
    metadata: extraction.metadata,
    summary: analysis.summary,
    warnings: analysis.warnings,
    insights: analysis.insights,
    nextActions: analysis.nextActions,
    knowledgeGraph: analysis.knowledgeGraph,
    uploadedAt: new Date().toISOString(),
  });

  /* ─── Index file chunks for FTS5 search ─── */
  if (extraction.text && extraction.text.length > 20) {
    indexFileChunks(fileId, originalname, extraction.text);
  }

  res.json(analysis);
});

/* ─── GET /api/files — list analyzed files ─── */
app.get("/api/files", (req, res) => {
  const list = [];
  for (const [id, entry] of fileStore) {
    list.push({
      fileId: id,
      filename: entry.filename,
      ext: entry.ext,
      textPreview: entry.extractedText?.slice(0, 200),
      uploadedAt: entry.uploadedAt,
    });
  }
  res.json(list);
});

/* ─── GET /api/files/:id — full extracted content ─── */
app.get("/api/files/:id", (req, res) => {
  const entry = fileStore.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "File not found" });
  res.json(entry);
});

/* ─── Serve built frontend in production ─── */
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  /* ─── Start Server ─── */
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GeoMind AI backend running on http://localhost:${PORT}`);
  });
}

startServer();
