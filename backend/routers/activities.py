"""
Project activity / timeline endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase

router = APIRouter()


@router.get("/")
async def list_activities(
    limit: int = 50,
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """List timeline activities for the current user."""
    supabase = get_supabase()
    query = supabase.table("activities").select("*").eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/count")
async def count_activities(
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Count activities."""
    supabase = get_supabase()
    query = supabase.table("activities").select("id", count="exact").eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
    result = query.execute()
    return {"count": result.count or 0}


@router.get("/{activity_id}")
async def get_activity(activity_id: str, user: dict = Depends(get_current_user)):
    """Get a single timeline activity."""
    supabase = get_supabase()
    result = supabase.table("activities") \
        .select("*") \
        .eq("id", activity_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Activity not found")
    return result.data[0]