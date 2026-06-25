"""
Smart Search — cross-project search across projects, files, and reports.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase

router = APIRouter()


@router.get("/")
async def smart_search(
    q: str = Query(..., min_length=1),
    project_id: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    term = f"%{q.strip()}%"

    def dedupe_search(table: str, columns: list[str], select: str, pid_field: str = "project_id"):
        seen: set[str] = set()
        rows: list[dict] = []
        for col in columns:
            query = supabase.table(table).select(select).eq("user_id", user["id"]).ilike(col, term).limit(limit)
            if project_id and pid_field:
                query = query.eq(pid_field, project_id)
            if project_id and table == "projects":
                query = query.eq("id", project_id)
            for row in query.execute().data or []:
                rid = row["id"]
                if rid not in seen:
                    seen.add(rid)
                    rows.append(row)
        return rows[:limit]

    projects = dedupe_search(
        "projects",
        ["name", "client_name", "location", "description"],
        "id,name,client_name,location,status,description",
        pid_field="",
    )
    files = dedupe_search(
        "files",
        ["filename", "preview_text", "file_ext"],
        "id,filename,file_ext,file_size,project_id,status",
    )
    reports = dedupe_search(
        "generated_reports",
        ["title", "report_type"],
        "id,title,report_type,project_id,created_at",
    )
    activities = dedupe_search(
        "activities",
        ["description"],
        "id,description,action,project_id,created_at,metadata",
    )

    return {
        "query": q,
        "projects": projects,
        "files": files,
        "reports": reports,
        "activities": activities,
        "total": len(projects) + len(files) + len(reports) + len(activities),
    }