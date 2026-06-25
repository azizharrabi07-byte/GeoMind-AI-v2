"""
Project CRUD endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from routers.auth import get_current_user
from database import get_supabase

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    status: str = "active"
    client_name: str = ""
    location: str = ""
    coordinate_system: str = ""
    due_date: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    client_name: str | None = None
    location: str | None = None
    coordinate_system: str | None = None
    progress: int | None = None
    due_date: str | None = None


@router.get("/")
async def list_projects(user: dict = Depends(get_current_user)):
    """List all projects for current user."""
    supabase = get_supabase()
    result = supabase.table("projects") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .order("updated_at", desc=True) \
        .execute()
    return result.data


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    """Get a single project by ID."""
    supabase = get_supabase()
    result = supabase.table("projects") \
        .select("*") \
        .eq("id", project_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.post("/")
async def create_project(req: ProjectCreate, user: dict = Depends(get_current_user)):
    """Create a new survey project."""
    supabase = get_supabase()
    data = {**req.model_dump(), "user_id": user["id"]}
    result = supabase.table("projects").insert(data).execute()
    if result.data:
        return result.data[0]
    raise HTTPException(status_code=500, detail="Creation failed")


@router.put("/{project_id}")
async def update_project(project_id: str, req: ProjectUpdate, user: dict = Depends(get_current_user)):
    """Update an existing project."""
    supabase = get_supabase()
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    data["updated_at"] = "now()"
    result = supabase.table("projects") \
        .update(data) \
        .eq("id", project_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if result.data:
        return result.data[0]
    raise HTTPException(status_code=404, detail="Project not found")


@router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    """Delete a project."""
    supabase = get_supabase()
    result = supabase.table("projects") \
        .delete() \
        .eq("id", project_id) \
        .eq("user_id", user["id"]) \
        .execute()
    return {"ok": True}
