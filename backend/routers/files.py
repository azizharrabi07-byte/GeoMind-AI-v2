"""
File upload, parsing, and analysis endpoints.
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase
from services.file_parser import parse_file
from services.ai_service import analyze_file_with_ai

router = APIRouter()


@router.get("/")
async def list_files(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """List all files for the current user, optionally filtered by project."""
    supabase = get_supabase()
    query = supabase.table("files").select("*").eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/{file_id}")
async def get_file(file_id: str, user: dict = Depends(get_current_user)):
    """Get file metadata and analysis results."""
    supabase = get_supabase()
    file_result = supabase.table("files") \
        .select("*") \
        .eq("id", file_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not file_result.data:
        raise HTTPException(status_code=404, detail="File not found")

    analysis_result = supabase.table("analysis_results") \
        .select("*") \
        .eq("file_id", file_id) \
        .execute()

    return {
        "file": file_result.data[0],
        "analysis": analysis_result.data[0] if analysis_result.data else None,
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Upload a file, parse it, and run AI analysis."""
    supabase = get_supabase()

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

    # Upload to Supabase Storage
    storage_path = f"{user['id']}/{uuid.uuid4()}/{file.filename}"
    supabase.storage.from_("user-files").upload(
        storage_path, file_bytes,
        {"content-type": file.content_type or "application/octet-stream"}
    )

    # Create file record
    file_data = {
        "user_id": user["id"],
        "project_id": project_id,
        "filename": file.filename,
        "file_ext": ext,
        "file_size": file_size,
        "mime_type": file.content_type or "",
        "storage_path": storage_path,
        "status": "processing",
    }
    result = supabase.table("files").insert(file_data).execute()
    file_record = result.data[0]

    # Parse file content
    try:
        parsed = parse_file(file.filename, file_bytes)

        # AI Analysis
        ai_result = await analyze_file_with_ai(file.filename, ext, parsed.get("text", ""))

        # Update file status
        supabase.table("files").update({"status": "analyzed"}).eq("id", file_record["id"]).execute()

        # Store analysis results
        analysis_data = {
            "user_id": user["id"],
            "file_id": file_record["id"],
            "summary": ai_result.get("summary", ""),
            "warnings": ai_result.get("warnings", []),
            "insights": ai_result.get("insights", []),
            "next_actions": ai_result.get("nextActions", []),
            "knowledge_graph": ai_result.get("knowledgeGraph", {"nodes": [], "edges": []}),
            "metadata": parsed.get("metadata", {}),
            "extracted_text": parsed.get("text", "")[:5000],
            "model_used": ai_result.get("model", "gemini-2.5-flash"),
        }
        supabase.table("analysis_results").insert(analysis_data).execute()

        # Log activity
        supabase.table("activities").insert({
            "user_id": user["id"],
            "project_id": project_id,
            "action": "file_uploaded",
            "description": f"Uploaded and analyzed {file.filename}",
            "metadata": {"file_id": file_record["id"], "ext": ext},
        }).execute()

        analysis = {
            "summary": ai_result.get("summary"),
            "warnings": ai_result.get("warnings", []),
            "insights": ai_result.get("insights", []),
            "next_actions": ai_result.get("nextActions", []),
            "knowledge_graph": ai_result.get("knowledgeGraph"),
        }
        return {"file": file_record, "analysis": analysis}

    except Exception as e:
        supabase.table("files").update({
            "status": "error",
            "error_message": str(e),
        }).eq("id", file_record["id"]).execute()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.delete("/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    """Delete a file and its analysis results."""
    supabase = get_supabase()
    file_record = supabase.table("files") \
        .select("storage_path") \
        .eq("id", file_id) \
        .eq("user_id", user["id"]) \
        .execute()

    if file_record.data:
        # Delete from storage
        supabase.storage.from_("user-files").remove([file_record.data[0]["storage_path"]])

    supabase.table("analysis_results").delete().eq("file_id", file_id).execute()
    supabase.table("files").delete().eq("id", file_id).eq("user_id", user["id"]).execute()

    return {"ok": True}
