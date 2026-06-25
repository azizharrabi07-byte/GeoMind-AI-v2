"""
Third-party integration endpoints — Google Drive OAuth + file sync (Phase 4).
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional

from routers.auth import get_current_user
from database import get_supabase
from config import settings
from services import google_drive_service as gdrive
from services.file_import_service import import_file_bytes

router = APIRouter()


class IntegrationConfig(BaseModel):
    provider: str  # google_drive, onedrive, outlook, gmail, dropbox
    access_token: str = ""
    refresh_token: str = ""
    provider_email: str = ""
    settings: dict = {}


class SyncRequest(BaseModel):
    project_id: Optional[str] = None


@router.get("/")
async def list_integrations(user: dict = Depends(get_current_user)):
    """List all integrations for current user (tokens redacted)."""
    supabase = get_supabase()
    result = supabase.table("integrations") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .execute()
    safe = []
    for row in result.data or []:
        safe.append({
            **row,
            "access_token": "***" if row.get("access_token") else "",
            "refresh_token": "***" if row.get("refresh_token") else "",
        })
    return safe


@router.get("/google_drive/oauth/url")
async def google_drive_oauth_url(user: dict = Depends(get_current_user)):
    """Return Google OAuth authorization URL for Drive read access."""
    if not gdrive.is_configured():
        return {
            "configured": False,
            "url": None,
            "message": "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env",
        }
    return {
        "configured": True,
        "url": gdrive.build_auth_url(user["id"]),
    }


@router.get("/google_drive/oauth/callback")
async def google_drive_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
):
    """OAuth callback — exchange code, store tokens, redirect to dashboard settings."""
    app_url = settings.app_url.rstrip("/")
    fail = f"{app_url}/#dashboard?tab=settings&integration=google_drive&status=error"

    if error or not code or not state:
        return RedirectResponse(fail)

    user_id = gdrive.verify_oauth_state(state)
    if not user_id:
        return RedirectResponse(fail)

    try:
        tokens = await gdrive.exchange_code(code)
    except Exception as e:
        return RedirectResponse(f"{fail}&detail={str(e)[:80]}")

    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    email = await gdrive.get_user_email(access_token) if access_token else ""

    supabase = get_supabase()
    data = {
        "user_id": user_id,
        "provider": "google_drive",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "provider_email": email,
        "settings": {"sync_folder": "GeoMind Imports", "imported_drive_ids": []},
        "is_connected": bool(access_token),
    }
    supabase.table("integrations").upsert(data, on_conflict="user_id,provider").execute()

    return RedirectResponse(
        f"{app_url}/#dashboard?tab=settings&integration=google_drive&status=connected"
    )


@router.post("/")
async def connect_integration(req: IntegrationConfig, user: dict = Depends(get_current_user)):
    """Connect a third-party integration (manual token entry / legacy)."""
    if req.provider == "google_drive":
        raise HTTPException(
            status_code=400,
            detail="Use GET /api/integrations/google_drive/oauth/url for Google Drive OAuth",
        )
    supabase = get_supabase()
    data = {
        **req.model_dump(),
        "user_id": user["id"],
        "is_connected": bool(req.access_token),
    }
    result = supabase.table("integrations").upsert(
        data,
        on_conflict="user_id,provider",
    ).execute()
    row = result.data[0] if result.data else {"ok": True}
    if isinstance(row, dict):
        row["access_token"] = "***" if row.get("access_token") else ""
        row["refresh_token"] = "***" if row.get("refresh_token") else ""
    return row


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


async def _get_valid_drive_token(supabase, integration: dict) -> str:
    access = integration.get("access_token") or ""
    refresh = integration.get("refresh_token") or ""
    if not access and not refresh:
        raise HTTPException(status_code=400, detail="Google Drive not authenticated")

    if access:
        return access

    if not refresh:
        raise HTTPException(status_code=400, detail="Google Drive token expired — reconnect")

    tokens = await gdrive.refresh_access_token(refresh)
    new_access = tokens.get("access_token", "")
    if not new_access:
        raise HTTPException(status_code=400, detail="Failed to refresh Google Drive token")

    update: dict = {"access_token": new_access}
    if tokens.get("refresh_token"):
        update["refresh_token"] = tokens["refresh_token"]

    supabase.table("integrations").update(update).eq("id", integration["id"]).execute()
    return new_access


@router.post("/google_drive/sync")
async def sync_google_drive(
    req: SyncRequest = SyncRequest(),
    user: dict = Depends(get_current_user),
):
    """Import new files from the user's GeoMind Imports Drive folder."""
    supabase = get_supabase()
    result = supabase.table("integrations") \
        .select("*") \
        .eq("provider", "google_drive") \
        .eq("user_id", user["id"]) \
        .execute()

    if not result.data or not result.data[0].get("is_connected"):
        raise HTTPException(status_code=400, detail="google_drive is not connected")

    if not gdrive.is_configured():
        raise HTTPException(status_code=503, detail="Google Drive OAuth not configured")

    integration = result.data[0]
    token = await _get_valid_drive_token(supabase, integration)
    settings_data = integration.get("settings") or {}
    folder_name = settings_data.get("sync_folder", "GeoMind Imports")
    imported_ids = set(settings_data.get("imported_drive_ids") or [])

    drive_files = await gdrive.list_importable_files(token, folder_name, imported_ids)
    imported: list[dict] = []
    errors: list[str] = []

    for df in drive_files:
        fid = df["id"]
        name = df["name"]
        try:
            content = await gdrive.download_file(token, fid)
            mime = gdrive.guess_content_type(name, df.get("mimeType", ""))
            result_item = await import_file_bytes(
                supabase,
                user["id"],
                name,
                content,
                content_type=mime,
                project_id=req.project_id,
                source="google_drive",
                external_id=fid,
            )
            imported_ids.add(fid)
            imported.append({
                "file_id": result_item["file"]["id"],
                "filename": name,
                "drive_id": fid,
            })
        except Exception as e:
            errors.append(f"{name}: {str(e)[:120]}")

    settings_data["imported_drive_ids"] = list(imported_ids)
    supabase.table("integrations").update({
        "settings": settings_data,
        "last_sync_at": "now()",
    }).eq("id", integration["id"]).execute()

    return {
        "ok": True,
        "imported": len(imported),
        "files": imported,
        "errors": errors,
        "message": f"Imported {len(imported)} file(s) from Google Drive",
    }


@router.post("/{provider}/sync")
async def sync_integration(
    provider: str,
    req: SyncRequest = SyncRequest(),
    user: dict = Depends(get_current_user),
):
    """Sync files from an integration provider."""
    if provider == "google_drive":
        return await sync_google_drive(req, user)

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

    return {
        "ok": True,
        "message": f"{provider} sync scaffold — OAuth ships in Phase 4b",
        "imported": 0,
    }