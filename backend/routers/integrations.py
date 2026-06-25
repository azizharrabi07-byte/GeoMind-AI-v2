"""
Third-party integration endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase

router = APIRouter()


class IntegrationConfig(BaseModel):
    provider: str  # google_drive, onedrive, outlook, gmail, dropbox
    access_token: str = ""
    refresh_token: str = ""
    provider_email: str = ""
    settings: dict = {}


@router.get("/")
async def list_integrations(user: dict = Depends(get_current_user)):
    """List all integrations for current user."""
    supabase = get_supabase()
    result = supabase.table("integrations") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .execute()
    return result.data


@router.post("/")
async def connect_integration(req: IntegrationConfig, user: dict = Depends(get_current_user)):
    """Connect a third-party integration."""
    supabase = get_supabase()
    data = {
        **req.model_dump(),
        "user_id": user["id"],
        "is_connected": bool(req.access_token),
    }
    result = supabase.table("integrations").upsert(
        data,
        on_conflict=["user_id", "provider"],
    ).execute()
    return result.data[0] if result.data else {"ok": True}


@router.delete("/{integration_id}")
async def disconnect_integration(integration_id: str, user: dict = Depends(get_current_user)):
    """Disconnect an integration."""
    supabase = get_supabase()
    supabase.table("integrations") \
        .delete() \
        .eq("id", integration_id) \
        .eq("user_id", user["id"]) \
        .execute()
    return {"ok": True}


@router.post("/{provider}/sync")
async def sync_integration(provider: str, user: dict = Depends(get_current_user)):
    """Sync files from an integration provider."""
    supabase = get_supabase()
    integration = supabase.table("integrations") \
        .select("*") \
        .eq("provider", provider) \
        .eq("user_id", user["id"]) \
        .execute()

    if not integration.data or not integration.data[0].get("is_connected"):
        raise HTTPException(status_code=400, detail=f"{provider} is not connected")

    supabase.table("integrations") \
        .update({"last_sync_at": "now()"}) \
        .eq("id", integration.data[0]["id"]) \
        .execute()

    return {"ok": True, "message": f"Sync initiated for {provider}"}