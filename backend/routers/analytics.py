"""
Firm analytics — real stats from Supabase (no fake numbers).
"""
from fastapi import APIRouter, Depends
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase

router = APIRouter()


@router.get("/")
async def firm_analytics(
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    uid = user["id"]

    def scoped(table: str):
        q = supabase.table(table).select("*", count="exact").eq("user_id", uid)
        if project_id:
            q = q.eq("project_id", project_id)
        return q

    files_r = scoped("files").execute()
    reports_r = scoped("generated_reports").execute()
    gis_r = scoped("gis_features").execute()
    acts_r = scoped("activities").execute()

    projects_q = supabase.table("projects").select("*").eq("user_id", uid)
    projects = projects_q.execute().data or []

    files = files_r.data or []
    type_counts: dict[str, int] = {}
    analyzed = 0
    total_bytes = 0
    for f in files:
        ext = (f.get("file_ext") or "other").lower()
        type_counts[ext] = type_counts.get(ext, 0) + 1
        if f.get("status") == "analyzed":
            analyzed += 1
        total_bytes += f.get("file_size") or 0

    status_counts: dict[str, int] = {}
    for p in projects:
        s = p.get("status") or "draft"
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "projects": len(projects),
        "files": files_r.count or len(files),
        "reports": reports_r.count or 0,
        "gis_features": gis_r.count or 0,
        "activities": acts_r.count or 0,
        "analyzed_files": analyzed,
        "total_storage_mb": round(total_bytes / (1024 * 1024), 2),
        "file_types": type_counts,
        "project_status": status_counts,
    }