"""
Map AI — summarize GIS changes and generate map reports via Gemini.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from services.ai_service import chat_with_ai

router = APIRouter()


class MapAiRequest(BaseModel):
    message: str
    project_name: Optional[str] = None
    changes: list[dict] = []
    stats: dict = {}
    project_id: Optional[str] = None


@router.post("/")
async def map_ai(req: MapAiRequest, user: dict = Depends(get_current_user)):
    change_lines = "\n".join(
        f"- {c.get('action', 'change')}: {c.get('detail', '')}"
        for c in req.changes[:15]
    ) or "No changes recorded yet."
    stats = req.stats or {}
    prompt = f"""You are Map AI for GeoMind survey projects. The user asked: "{req.message}"

Project: {req.project_name or 'Unknown'}
Map stats: {stats.get('points', 0)} points, {stats.get('lines', 0)} lines, {stats.get('polygons', 0)} polygons

Recent map changes:
{change_lines}

Provide a concise survey-focused response. If they asked for a report, structure it with:
- Summary of changes
- Feature counts
- Recommended next steps (cross-check with uploaded files, verify CRS, etc.)
Keep it practical for a land surveyor."""

    result = await chat_with_ai(
        message=prompt,
        history=[],
        file_contexts=[],
        map_context=stats,
        rag_sources=[],
    )
    return {"reply": result.get("reply", "Map analysis complete.")}