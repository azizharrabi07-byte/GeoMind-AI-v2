"""
Third-party integration endpoints — Google Drive + Microsoft OneDrive/Outlook (Phase 4/4b).
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional

from routers.auth import get_current_user
from database import get_supabase
from config import settings
from services import google_drive_service as gdrive
from services import microsoft_service as msgraph
from services.oauth_state import verify_oauth_state
from services.integration_files import guess_content_type
from services.file_import_service import import_file_bytes

router = APIRouter()

OAUTH_PROVIDERS = {"google_drive", "onedrive", "outlook"}


class IntegrationConfig(BaseModel):
    provider: str
    access_token: str = ""
    refresh_token: str = ""
    provider_email: str = ""
    settings: dict = {}


class SyncRequest(BaseModel):
    project_id: Optional[str] = None


def _redact_integration(row: dict) -> dict:
    return {
        **row,
        "access_token": "***" if row.get("access_token") else "",
        "refresh_token": "***" if row.get("refresh_token") else "",
    }


def _redirect_settings(provider: str, status: str, detail: str = "") -> str:
    app_url = settings.app_url.rstrip("/")
    url = f"{app_url}/#dashboard?tab=settings&integration={provider}&status={status}"
    if detail:
        url += f"&detail={detail[:120]}"
    return url


async def _refresh_token(
    supabase,
    integration: dict,
    refresh_fn,
    provider_label: str,
) -> str:
    access = integration.get("access_token") or ""
    refresh = integration.get("refresh_token") or ""
    if not access and not refresh:
        raise HTTPException(status_code=400, detail=f"{provider_label} not authenticated")
    if access:
        return access
    if not refresh:
        raise HTTPException(status_code=400, detail=f"{provider_label} token expired — reconnect")

    tokens = await refresh_fn(refresh)
    new_access = tokens.get("access_token", "")
    if not new_access:
        raise HTTPException(status_code=400, detail=f"Failed to refresh {provider_label} token")

    update: dict = {"access_token": new_access}
    if tokens.get("refresh_token"):
        update["refresh_token"] = tokens["refresh_token"]
    supabase.table("integrations").update(update).eq("id", integration["id"]).execute()
    return new_access


async def _get_integration(supabase, user_id: str, provider: str) -> dict:
    result = supabase.table("integrations") \
        .select("*") \
        .eq("provider", provider) \
        .eq("user_id", user_id) \
        .execute()
    if not result.data or not result.data[0].get("is_connected"):
        raise HTTPException(status_code=400, detail=f"{provider} is not connected")
    return result.data[0]


@router.get("/")
async def list_integrations(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("integrations") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .execute()
    return [_redact_integration(row) for row in (result.data or [])]


@router.get("/google_drive/oauth/url")
async def google_drive_oauth_url(user: dict = Depends(get_current_user)):
    if not gdrive.is_configured():
        return {"configured": False, "url": None, "message": "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env"}
    return {"configured": True, "url": gdrive.build_auth_url(user["id"])}


@router.get("/onedrive/oauth/url")
async def onedrive_oauth_url(user: dict = Depends(get_current_user)):
    if not msgraph.is_configured():
        return {"configured": False, "url": None, "message": "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in backend/.env"}
    return {"configured": True, "url": msgraph.build_onedrive_auth_url(user["id"])}


@router.get("/outlook/oauth/url")
async def outlook_oauth_url(user: dict = Depends(get_current_user)):
    if not msgraph.is_configured():
        return {"configured": False, "url": None, "message": "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in backend/.env"}
    return {"configured": True, "url": msgraph.build_outlook_auth_url(user["id"])}


@router.get("/google_drive/oauth/callback")
async def google_drive_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error or not code or not state:
        return RedirectResponse(_redirect_settings("google_drive", "error", error or "missing_code"))

    state_data = verify_oauth_state(state)
    user_id = state_data.get("uid") if state_data else None
    if not user_id:
        return RedirectResponse(_redirect_settings("google_drive", "error", "invalid_state"))

    try:
        tokens = await gdrive.exchange_code(code)
    except Exception as e:
        return RedirectResponse(_redirect_settings("google_drive", "error", str(e)))

    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    email = await gdrive.get_user_email(access_token) if access_token else ""

    supabase = get_supabase()
    supabase.table("integrations").upsert({
        "user_id": user_id,
        "provider": "google_drive",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "provider_email": email,
        "settings": {"sync_folder": "GeoMind Imports", "imported_drive_ids": []},
        "is_connected": bool(access_token),
    }, on_conflict="user_id,provider").execute()

    return RedirectResponse(_redirect_settings("google_drive", "connected"))


@router.get("/onedrive/oauth/callback")
async def onedrive_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error or not code or not state:
        return RedirectResponse(_redirect_settings("onedrive", "error", error or "missing_code"))

    state_data = verify_oauth_state(state)
    user_id = state_data.get("uid") if state_data else None
    if not user_id:
        return RedirectResponse(_redirect_settings("onedrive", "error", "invalid_state"))

    try:
        tokens = await msgraph.exchange_code(code, settings.microsoft_onedrive_redirect_uri)
    except Exception as e:
        return RedirectResponse(_redirect_settings("onedrive", "error", str(e)))

    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    email = await msgraph.get_user_email(access_token) if access_token else ""

    supabase = get_supabase()
    supabase.table("integrations").upsert({
        "user_id": user_id,
        "provider": "onedrive",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "provider_email": email,
        "settings": {"sync_folder": "GeoMind Imports", "imported_onedrive_ids": []},
        "is_connected": bool(access_token),
    }, on_conflict="user_id,provider").execute()

    return RedirectResponse(_redirect_settings("onedrive", "connected"))


@router.get("/outlook/oauth/callback")
async def outlook_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    if error or not code or not state:
        return RedirectResponse(_redirect_settings("outlook", "error", error or "missing_code"))

    state_data = verify_oauth_state(state)
    user_id = state_data.get("uid") if state_data else None
    if not user_id:
        return RedirectResponse(_redirect_settings("outlook", "error", "invalid_state"))

    try:
        tokens = await msgraph.exchange_code(code, settings.microsoft_outlook_redirect_uri)
    except Exception as e:
        return RedirectResponse(_redirect_settings("outlook", "error", str(e)))

    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    email = await msgraph.get_user_email(access_token) if access_token else ""

    supabase = get_supabase()
    supabase.table("integrations").upsert({
        "user_id": user_id,
        "provider": "outlook",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "provider_email": email,
        "settings": {"synced_message_ids": [], "linked_messages": []},
        "is_connected": bool(access_token),
    }, on_conflict="user_id,provider").execute()

    return RedirectResponse(_redirect_settings("outlook", "connected"))


@router.post("/")
async def connect_integration(req: IntegrationConfig, user: dict = Depends(get_current_user)):
    if req.provider in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Use GET /api/integrations/{req.provider}/oauth/url for OAuth connect",
        )
    supabase = get_supabase()
    data = {**req.model_dump(), "user_id": user["id"], "is_connected": bool(req.access_token)}
    result = supabase.table("integrations").upsert(data, on_conflict="user_id,provider").execute()
    row = result.data[0] if result.data else {"ok": True}
    return _redact_integration(row) if isinstance(row, dict) else row


@router.delete("/{integration_id}")
async def disconnect_integration(integration_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    supabase.table("integrations").delete().eq("id", integration_id).eq("user_id", user["id"]).execute()
    return {"ok": True}


@router.post("/google_drive/sync")
async def sync_google_drive(req: SyncRequest = SyncRequest(), user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    integration = await _get_integration(supabase, user["id"], "google_drive")
    if not gdrive.is_configured():
        raise HTTPException(status_code=503, detail="Google Drive OAuth not configured")

    token = await _refresh_token(supabase, integration, gdrive.refresh_access_token, "Google Drive")
    settings_data = integration.get("settings") or {}
    folder_name = settings_data.get("sync_folder", "GeoMind Imports")
    imported_ids = set(settings_data.get("imported_drive_ids") or [])

    drive_files = await gdrive.list_importable_files(token, folder_name, imported_ids)
    imported: list[dict] = []
    errors: list[str] = []

    for df in drive_files:
        fid, name = df["id"], df["name"]
        try:
            content = await gdrive.download_file(token, fid)
            mime = guess_content_type(name, df.get("mimeType", ""))
            result_item = await import_file_bytes(
                supabase, user["id"], name, content,
                content_type=mime, project_id=req.project_id,
                source="google_drive", external_id=fid,
            )
            imported_ids.add(fid)
            imported.append({"file_id": result_item["file"]["id"], "filename": name, "external_id": fid})
        except Exception as e:
            errors.append(f"{name}: {str(e)[:120]}")

    settings_data["imported_drive_ids"] = list(imported_ids)
    supabase.table("integrations").update({"settings": settings_data, "last_sync_at": "now()"}).eq("id", integration["id"]).execute()
    return {"ok": True, "imported": len(imported), "files": imported, "errors": errors,
            "message": f"Imported {len(imported)} file(s) from Google Drive"}


@router.post("/onedrive/sync")
async def sync_onedrive(req: SyncRequest = SyncRequest(), user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    integration = await _get_integration(supabase, user["id"], "onedrive")
    if not msgraph.is_configured():
        raise HTTPException(status_code=503, detail="Microsoft OAuth not configured")

    token = await _refresh_token(supabase, integration, msgraph.refresh_access_token, "OneDrive")
    settings_data = integration.get("settings") or {}
    folder_name = settings_data.get("sync_folder", "GeoMind Imports")
    imported_ids = set(settings_data.get("imported_onedrive_ids") or [])

    files = await msgraph.list_onedrive_importable_files(token, folder_name, imported_ids)
    imported: list[dict] = []
    errors: list[str] = []

    for item in files:
        fid, name = item["id"], item["name"]
        try:
            content = await msgraph.download_onedrive_file(token, fid)
            mime = guess_content_type(name, (item.get("file") or {}).get("mimeType", ""))
            result_item = await import_file_bytes(
                supabase, user["id"], name, content,
                content_type=mime, project_id=req.project_id,
                source="onedrive", external_id=fid,
            )
            imported_ids.add(fid)
            imported.append({"file_id": result_item["file"]["id"], "filename": name, "external_id": fid})
        except Exception as e:
            errors.append(f"{name}: {str(e)[:120]}")

    settings_data["imported_onedrive_ids"] = list(imported_ids)
    supabase.table("integrations").update({"settings": settings_data, "last_sync_at": "now()"}).eq("id", integration["id"]).execute()
    return {"ok": True, "imported": len(imported), "files": imported, "errors": errors,
            "message": f"Imported {len(imported)} file(s) from OneDrive"}


@router.post("/outlook/sync")
async def sync_outlook(req: SyncRequest = SyncRequest(), user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    integration = await _get_integration(supabase, user["id"], "outlook")
    if not msgraph.is_configured():
        raise HTTPException(status_code=503, detail="Microsoft OAuth not configured")

    token = await _refresh_token(supabase, integration, msgraph.refresh_access_token, "Outlook")
    settings_data = integration.get("settings") or {}
    known_ids = set(settings_data.get("synced_message_ids") or [])
    linked = list(settings_data.get("linked_messages") or [])

    messages = await msgraph.fetch_recent_emails(token, limit=30)
    new_count = 0
    for msg in messages:
        mid = msg.get("id")
        if not mid or mid in known_ids:
            continue
        known_ids.add(mid)
        linked.insert(0, msg)
        new_count += 1

        if req.project_id:
            supabase.table("activities").insert({
                "user_id": user["id"],
                "project_id": req.project_id,
                "action": "email_linked",
                "description": f'Linked email: "{msg.get("subject", "")}" from {msg.get("from", "")}',
                "metadata": {
                    "message_id": mid,
                    "subject": msg.get("subject"),
                    "from": msg.get("from"),
                    "source": "outlook",
                    "navigate_tab": "timeline",
                },
            }).execute()

    settings_data["synced_message_ids"] = list(known_ids)[-200:]
    settings_data["linked_messages"] = linked[:50]
    supabase.table("integrations").update({"settings": settings_data, "last_sync_at": "now()"}).eq("id", integration["id"]).execute()

    return {
        "ok": True,
        "imported": new_count,
        "messages": linked[:10],
        "errors": [],
        "message": f"Linked {new_count} new Outlook email(s)" + (f" to project" if req.project_id and new_count else ""),
    }


@router.post("/{provider}/sync")
async def sync_integration(provider: str, req: SyncRequest = SyncRequest(), user: dict = Depends(get_current_user)):
    if provider == "google_drive":
        return await sync_google_drive(req, user)
    if provider == "onedrive":
        return await sync_onedrive(req, user)
    if provider == "outlook":
        return await sync_outlook(req, user)
    raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")