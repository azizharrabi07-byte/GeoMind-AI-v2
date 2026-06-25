"""
GIS features endpoints — points, lines, polygons.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase

router = APIRouter()


class GISFeatureCreate(BaseModel):
    project_id: Optional[str] = None
    feature_type: str  # point, line, polygon
    geometry: dict  # GeoJSON geometry
    label: str = ""
    description: str = ""
    elevation: float | None = None
    properties: dict = {}


class GISFeatureUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    elevation: float | None = None
    properties: dict | None = None


@router.get("/")
async def list_features(
    project_id: Optional[str] = None,
    feature_type: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """List GIS features, optionally filtered by project or type."""
    supabase = get_supabase()
    query = supabase.table("gis_features").select("*").eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
    if feature_type:
        query = query.eq("feature_type", feature_type)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.post("/")
async def create_feature(req: GISFeatureCreate, user: dict = Depends(get_current_user)):
    """Create a new GIS feature (point, line, polygon)."""
    supabase = get_supabase()
    data = {**req.model_dump(), "user_id": user["id"]}
    result = supabase.table("gis_features").insert(data).execute()
    if result.data:
        feature = result.data[0]
        if req.project_id:
            supabase.table("activities").insert({
                "user_id": user["id"],
                "project_id": req.project_id,
                "action": "gis_updated",
                "description": f"Added {req.feature_type} \"{req.label or 'feature'}\" to map",
                "metadata": {"feature_id": feature["id"], "navigate_tab": "map"},
            }).execute()
        return feature
    raise HTTPException(status_code=500, detail="Creation failed")


@router.put("/{feature_id}")
async def update_feature(feature_id: str, req: GISFeatureUpdate, user: dict = Depends(get_current_user)):
    """Update a GIS feature."""
    supabase = get_supabase()
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("gis_features") \
        .update(data) \
        .eq("id", feature_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if result.data:
        return result.data[0]
    raise HTTPException(status_code=404, detail="Feature not found")


@router.delete("/{feature_id}")
async def delete_feature(feature_id: str, user: dict = Depends(get_current_user)):
    """Delete a GIS feature."""
    supabase = get_supabase()
    result = supabase.table("gis_features") \
        .delete() \
        .eq("id", feature_id) \
        .eq("user_id", user["id"]) \
        .execute()
    return {"ok": True}


@router.delete("/")
async def clear_features(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Clear all GIS features, optionally for a project."""
    supabase = get_supabase()
    query = supabase.table("gis_features").delete().eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
    query.execute()
    return {"ok": True}
