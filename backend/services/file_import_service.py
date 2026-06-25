"""Shared file import pipeline — upload storage, parse, AI analyze, timeline."""
from __future__ import annotations

import uuid
from typing import Any, Optional

from services.file_parser import parse_file
from services.ai_service import analyze_file_with_ai
from services.timeline_service import create_file_version, log_activity


async def import_file_bytes(
    supabase,
    user_id: str,
    filename: str,
    file_bytes: bytes,
    *,
    content_type: str = "application/octet-stream",
    project_id: Optional[str] = None,
    source: str = "upload",
    external_id: Optional[str] = None,
) -> dict[str, Any]:
    """Store, parse, analyze, and log a file. Returns {file, analysis}."""
    file_size = len(file_bytes)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    storage_path = f"{user_id}/{uuid.uuid4()}/{filename}"
    supabase.storage.from_("user-files").upload(
        storage_path,
        file_bytes,
        {"content-type": content_type},
    )

    file_data = {
        "user_id": user_id,
        "project_id": project_id,
        "filename": filename,
        "file_ext": ext,
        "file_size": file_size,
        "mime_type": content_type,
        "storage_path": storage_path,
        "preview_text": "",
        "status": "processing",
    }
    result = supabase.table("files").insert(file_data).execute()
    file_record = result.data[0]

    parsed = parse_file(filename, file_bytes)
    preview_text = (parsed.get("text") or "")[:8000]
    supabase.table("files").update({
        "preview_text": preview_text,
        "status": "analyzed",
    }).eq("id", file_record["id"]).execute()
    file_record["preview_text"] = preview_text
    file_record["status"] = "analyzed"

    ai_result = await analyze_file_with_ai(filename, ext, parsed.get("text", ""))

    analysis_data = {
        "user_id": user_id,
        "file_id": file_record["id"],
        "summary": ai_result.get("summary", ""),
        "warnings": ai_result.get("warnings", []),
        "insights": ai_result.get("insights", []),
        "next_actions": ai_result.get("nextActions", []),
        "knowledge_graph": ai_result.get("knowledgeGraph", {"nodes": [], "edges": []}),
        "metadata": {
            **(parsed.get("metadata") or {}),
            "source": source,
            "external_id": external_id,
        },
        "extracted_text": preview_text,
        "model_used": ai_result.get("model", "gemini-2.5-flash"),
    }
    supabase.table("analysis_results").insert(analysis_data).execute()

    version = create_file_version(supabase, user_id, file_record, preview_text)
    action = "file_synced" if source != "upload" else "file_uploaded"
    verb = "Synced" if source != "upload" else "Uploaded and analyzed"
    log_activity(
        supabase,
        user_id,
        project_id,
        action,
        f'{verb} "{filename}"',
        {
            "file_id": file_record["id"],
            "version_id": version.get("id"),
            "filename": filename,
            "source": source,
            "external_id": external_id,
            "navigate_tab": "files",
        },
    )

    analysis = {
        "summary": ai_result.get("summary"),
        "warnings": ai_result.get("warnings", []),
        "insights": ai_result.get("insights", []),
        "next_actions": ai_result.get("nextActions", []),
    }
    return {"file": file_record, "analysis": analysis}