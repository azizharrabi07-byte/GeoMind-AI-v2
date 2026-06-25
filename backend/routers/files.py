"""
File upload, parsing, analysis, and version restore endpoints.
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase
from services.file_parser import parse_file
from services.ai_service import analyze_file_with_ai
from services.timeline_service import create_file_version, log_activity, restore_file_version

router = APIRouter()


@router.get("/")
async def list_files(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    query = supabase.table("files").select("*").eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/versions/{version_id}")
async def get_file_version(version_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("file_versions") \
        .select("*") \
        .eq("id", version_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Version not found")
    return result.data[0]


@router.post("/versions/{version_id}/restore")
async def restore_version(version_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    try:
        return restore_file_version(supabase, user["id"], version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{file_id}")
async def get_file(file_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    file_result = supabase.table("files") \
        .select("*") \
        .eq("id", file_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not file_result.data:
        raise HTTPException(status_code=404, detail="File not found")

    file_row = file_result.data[0]
    analysis_result = supabase.table("analysis_results") \
        .select("*") \
        .eq("file_id", file_id) \
        .execute()
    analysis = analysis_result.data[0] if analysis_result.data else None

    if not file_row.get("preview_text") and analysis:
        file_row["preview_text"] = (analysis.get("extracted_text") or "")[:8000]

    if file_row.get("storage_path"):
        try:
            signed = supabase.storage.from_("user-files").create_signed_url(
                file_row["storage_path"], 3600
            )
            file_row["download_url"] = signed.get("signedURL") or signed.get("signedUrl")
        except Exception:
            file_row["download_url"] = None

    if analysis:
        analysis = {
            **analysis,
            "warnings": analysis.get("warnings") or [],
            "insights": analysis.get("insights") or [],
            "next_actions": analysis.get("next_actions") or [],
        }

    return {"file": file_row, "analysis": analysis}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

    storage_path = f"{user['id']}/{uuid.uuid4()}/{file.filename}"
    supabase.storage.from_("user-files").upload(
        storage_path, file_bytes,
        {"content-type": file.content_type or "application/octet-stream"},
    )

    preview_text = ""
    file_data = {
        "user_id": user["id"],
        "project_id": project_id,
        "filename": file.filename,
        "file_ext": ext,
        "file_size": file_size,
        "mime_type": file.content_type or "",
        "storage_path": storage_path,
        "preview_text": "",
        "status": "processing",
    }
    result = supabase.table("files").insert(file_data).execute()
    file_record = result.data[0]

    try:
        parsed = parse_file(file.filename, file_bytes)
        preview_text = (parsed.get("text") or "")[:8000]
        supabase.table("files").update({
            "preview_text": preview_text,
            "status": "analyzed",
        }).eq("id", file_record["id"]).execute()
        file_record["preview_text"] = preview_text
        file_record["status"] = "analyzed"

        ai_result = await analyze_file_with_ai(file.filename, ext, parsed.get("text", ""))

        analysis_data = {
            "user_id": user["id"],
            "file_id": file_record["id"],
            "summary": ai_result.get("summary", ""),
            "warnings": ai_result.get("warnings", []),
            "insights": ai_result.get("insights", []),
            "next_actions": ai_result.get("nextActions", []),
            "knowledge_graph": ai_result.get("knowledgeGraph", {"nodes": [], "edges": []}),
            "metadata": parsed.get("metadata", {}),
            "extracted_text": preview_text,
            "model_used": ai_result.get("model", "gemini-2.5-flash"),
        }
        supabase.table("analysis_results").insert(analysis_data).execute()

        version = create_file_version(supabase, user["id"], file_record, preview_text)
        log_activity(
            supabase, user["id"], project_id, "file_uploaded",
            f'Uploaded and analyzed "{file.filename}"',
            {
                "file_id": file_record["id"],
                "version_id": version.get("id"),
                "filename": file.filename,
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

    except Exception as e:
        supabase.table("files").update({
            "status": "error",
            "error_message": str(e),
        }).eq("id", file_record["id"]).execute()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.delete("/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    file_result = supabase.table("files") \
        .select("*") \
        .eq("id", file_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not file_result.data:
        raise HTTPException(status_code=404, detail="File not found")

    file_row = file_result.data[0]
    version = create_file_version(supabase, user["id"], file_row, file_row.get("preview_text", ""))

    try:
        supabase.storage.from_("user-files").remove([file_row["storage_path"]])
    except Exception:
        pass

    supabase.table("analysis_results").delete().eq("file_id", file_id).execute()
    supabase.table("files").delete().eq("id", file_id).execute()

    log_activity(
        supabase, user["id"], file_row.get("project_id"), "file_deleted",
        f'Deleted file "{file_row["filename"]}"',
        {
            "file_id": file_id,
            "version_id": version.get("id"),
            "filename": file_row["filename"],
            "navigate_tab": "files",
            "can_restore": True,
        },
    )
    return {"ok": True}