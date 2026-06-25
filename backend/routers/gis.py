"""
GIS features endpoints — points, lines, polygons + snapshot restore.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase
from services.timeline_service import save_gis_snapshot, log_activity, restore_gis_snapshot

router = APIRouter()


class GISFeatureCreate(BaseModel):
    project_id: Optional[str] = None
    feature_type: str
    geometry: dict
    label: str = ""
    description: str = ""
    elevation: float | None = None
    properties: dict = {}


class GISFeatureUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    elevation: float | None = None
    properties: dict | None = None


@router.get("/snapshots/{snapshot_id}")
async def get_snapshot(snapshot_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("gis_snapshots") \
        .select("*") \
        .eq("id", snapshot_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return result.data[0]


@router.post("/snapshots/{snapshot_id}/restore")
async def restore_snapshot(snapshot_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    try:
        return restore_gis_snapshot(supabase, user["id"], snapshot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/")
async def list_features(
    project_id: Optional[str] = None,
    feature_type: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
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
    supabase = get_supabase()
    snapshot = save_gis_snapshot(
        supabase, user["id"], req.project_id,
        f"Before adding {req.feature_type}",
    )
    data = {**req.model_dump(), "user_id": user["id"]}
    result = supabase.table("gis_features").insert(data).execute()
    if result.data:
        feature = result.data[0]
        if req.project_id:
            log_activity(
                supabase, user["id"], req.project_id, "gis_updated",
                f'Added {req.feature_type} "{req.label or "feature"}" to map',
                {
                    "feature_id": feature["id"],
                    "feature_type": req.feature_type,
                    "snapshot_id": snapshot.get("id") if snapshot else None,
                    "navigate_tab": "map",
                },
            )
        return feature
    raise HTTPException(status_code=500, detail="Creation failed")


@router.put("/{feature_id}")
async def update_feature(feature_id: str, req: GISFeatureUpdate, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    existing = supabase.table("gis_features") \
        .select("*") \
        .eq("id", feature_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Feature not found")
    feat = existing.data[0]

    snapshot = save_gis_snapshot(
        supabase, user["id"], feat.get("project_id"),
        f'Before renaming {feat.get("label", "feature")}',
    )
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("gis_features") \
        .update(data) \
        .eq("id", feature_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if result.data:
        updated = result.data[0]
        if feat.get("project_id"):
            log_activity(
                supabase, user["id"], feat["project_id"], "gis_updated",
                f'Renamed {feat.get("feature_type")} to "{data.get("label", feat.get("label"))}"',
                {"feature_id": feature_id, "snapshot_id": snapshot.get("id") if snapshot else None, "navigate_tab": "map"},
            )
        return updated
    raise HTTPException(status_code=404, detail="Feature not found")


@router.delete("/{feature_id}")
async def delete_feature(feature_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    existing = supabase.table("gis_features") \
        .select("*") \
        .eq("id", feature_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if existing.data:
        feat = existing.data[0]
        snapshot = save_gis_snapshot(
            supabase, user["id"], feat.get("project_id"),
            f'Before deleting {feat.get("label", "feature")}',
        )
        supabase.table("gis_features").delete().eq("id", feature_id).execute()
        if feat.get("project_id"):
            log_activity(
                supabase, user["id"], feat["project_id"], "gis_updated",
                f'Removed {feat.get("feature_type")} "{feat.get("label", "")}" from map',
                {"feature_id": feature_id, "snapshot_id": snapshot.get("id") if snapshot else None, "navigate_tab": "map"},
            )
    return {"ok": True}


@router.delete("/")
async def clear_features(project_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    snapshot = save_gis_snapshot(supabase, user["id"], project_id, "Before clearing all features")
    query = supabase.table("gis_features").delete().eq("user_id", user["id"])
    if project_id:
        query = query.eq("project_id", project_id)
        log_activity(
            supabase, user["id"], project_id, "gis_updated",
            "Cleared all map features",
            {"snapshot_id": snapshot.get("id") if snapshot else None, "navigate_tab": "map"},
        )
    query.execute()
    return {"ok": True}