"""Microsoft Graph OAuth — OneDrive file sync + Outlook mail linking."""
from __future__ import annotations

import urllib.parse
from typing import Any, Optional

import httpx

from config import settings
from services.oauth_state import make_oauth_state
from services.integration_files import is_importable_filename, guess_content_type

AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0"
GRAPH_API = "https://graph.microsoft.com/v1.0"

ONEDRIVE_SCOPES = "offline_access User.Read Files.Read"
OUTLOOK_SCOPES = "offline_access User.Read Mail.Read"


def is_configured() -> bool:
    return bool(settings.microsoft_client_id and settings.microsoft_client_secret)


def build_onedrive_auth_url(user_id: str) -> str:
    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": settings.microsoft_onedrive_redirect_uri,
        "response_type": "code",
        "scope": ONEDRIVE_SCOPES,
        "response_mode": "query",
        "state": make_oauth_state(user_id, {"provider": "onedrive"}),
    }
    return f"{AUTH_BASE}/authorize?{urllib.parse.urlencode(params)}"


def build_outlook_auth_url(user_id: str) -> str:
    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": settings.microsoft_outlook_redirect_uri,
        "response_type": "code",
        "scope": OUTLOOK_SCOPES,
        "response_mode": "query",
        "state": make_oauth_state(user_id, {"provider": "outlook"}),
    }
    return f"{AUTH_BASE}/authorize?{urllib.parse.urlencode(params)}"


async def exchange_code(code: str, redirect_uri: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{AUTH_BASE}/token",
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{AUTH_BASE}/token",
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_user_email(access_token: str) -> str:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{GRAPH_API}/me",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"$select": "mail,userPrincipalName"},
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("mail") or data.get("userPrincipalName") or ""
    return ""


async def _graph_get(client: httpx.AsyncClient, path: str, token: str, params: dict | None = None):
    resp = await client.get(
        f"{GRAPH_API}{path}",
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
    )
    resp.raise_for_status()
    return resp.json()


async def find_onedrive_folder_id(token: str, folder_name: str = "GeoMind Imports") -> Optional[str]:
    safe_name = folder_name.replace("'", "''")
    async with httpx.AsyncClient(timeout=30) as client:
        data = await _graph_get(
            client,
            "/me/drive/root/children",
            token,
            {"$filter": f"name eq '{safe_name}'", "$select": "id,name,folder"},
        )
        for item in data.get("value") or []:
            if item.get("folder") and item.get("name") == folder_name:
                return item.get("id")
    return None


async def list_onedrive_importable_files(
    token: str,
    folder_name: str = "GeoMind Imports",
    imported_ids: Optional[set[str]] = None,
) -> list[dict[str, Any]]:
    imported_ids = imported_ids or set()
    folder_id = await find_onedrive_folder_id(token, folder_name)
    if not folder_id:
        return []

    results: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=60) as client:
        data = await _graph_get(
            client,
            f"/me/drive/items/{folder_id}/children",
            token,
            {"$select": "id,name,file,size,lastModifiedDateTime"},
        )
        for item in data.get("value") or []:
            if not item.get("file"):
                continue
            fid = item.get("id", "")
            name = item.get("name", "")
            if fid in imported_ids or not is_importable_filename(name):
                continue
            results.append(item)
    return results


async def download_onedrive_file(token: str, item_id: str) -> bytes:
    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        resp = await client.get(
            f"{GRAPH_API}/me/drive/items/{item_id}/content",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.content


async def fetch_recent_emails(token: str, limit: int = 30) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=30) as client:
        data = await _graph_get(
            client,
            "/me/messages",
            token,
            {
                "$top": str(limit),
                "$orderby": "receivedDateTime desc",
                "$select": "id,subject,from,receivedDateTime,bodyPreview,hasAttachments,webLink",
            },
        )
        messages = []
        for msg in data.get("value") or []:
            sender = (msg.get("from") or {}).get("emailAddress") or {}
            messages.append({
                "id": msg.get("id"),
                "subject": msg.get("subject") or "(no subject)",
                "from": sender.get("address") or sender.get("name") or "",
                "received_at": msg.get("receivedDateTime"),
                "preview": (msg.get("bodyPreview") or "")[:300],
                "has_attachments": bool(msg.get("hasAttachments")),
                "web_link": msg.get("webLink"),
            })
        return messages