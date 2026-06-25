"""Google Drive OAuth and file sync via Drive API v3."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import urllib.parse
from typing import Any, Optional

import httpx

from config import settings

DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_API = "https://www.googleapis.com/drive/v3"

SUPPORTED_EXTENSIONS = {
    "dxf", "csv", "txt", "geojson", "json", "pdf", "xlsx", "xls",
    "png", "jpg", "jpeg", "tif", "tiff", "xml", "kml", "gpx",
}

MIME_MAP = {
    "pdf": "application/pdf",
    "csv": "text/csv",
    "txt": "text/plain",
    "json": "application/json",
    "geojson": "application/geo+json",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "dxf": "application/dxf",
    "xml": "application/xml",
    "kml": "application/vnd.google-earth.kml+xml",
    "gpx": "application/gpx+xml",
}


def is_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def _state_secret() -> str:
    return settings.supabase_service_role_key or settings.google_client_secret or "geomind-oauth"


def make_oauth_state(user_id: str) -> str:
    payload = json.dumps({"uid": user_id, "ts": int(time.time())})
    sig = hmac.new(_state_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    raw = f"{payload}|{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def verify_oauth_state(state: str, max_age_sec: int = 600) -> Optional[str]:
    try:
        padded = state + "=" * (-len(state) % 4)
        raw = base64.urlsafe_b64decode(padded.encode()).decode()
        payload, sig = raw.rsplit("|", 1)
        expected = hmac.new(_state_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(payload)
        if int(time.time()) - int(data.get("ts", 0)) > max_age_sec:
            return None
        return data.get("uid")
    except Exception:
        return None


def build_auth_url(user_id: str) -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": DRIVE_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": make_oauth_state(user_id),
    }
    return f"{AUTH_URL}?{urllib.parse.urlencode(params)}"


async def exchange_code(code: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_user_email(access_token: str) -> str:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            return resp.json().get("email", "")
    return ""


async def _drive_get(client: httpx.AsyncClient, path: str, token: str, params: dict | None = None):
    resp = await client.get(
        f"{DRIVE_API}{path}",
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
    )
    resp.raise_for_status()
    return resp.json()


async def find_folder_id(token: str, folder_name: str) -> Optional[str]:
    q = (
        f"mimeType='application/vnd.google-apps.folder' and "
        f"name='{folder_name.replace(chr(39), chr(92)+chr(39))}' and trashed=false"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        data = await _drive_get(client, "/files", token, {
            "q": q,
            "fields": "files(id,name)",
            "pageSize": 5,
        })
        files = data.get("files") or []
        return files[0]["id"] if files else None


async def list_importable_files(
    token: str,
    folder_name: str = "GeoMind Imports",
    imported_ids: Optional[set[str]] = None,
) -> list[dict[str, Any]]:
    imported_ids = imported_ids or set()
    folder_id = await find_folder_id(token, folder_name)
    if not folder_id:
        return []

    q = f"'{folder_id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'"
    results: list[dict[str, Any]] = []
    page_token: Optional[str] = None

    async with httpx.AsyncClient(timeout=60) as client:
        while True:
            params: dict[str, Any] = {
                "q": q,
                "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime)",
                "pageSize": 50,
            }
            if page_token:
                params["pageToken"] = page_token
            data = await _drive_get(client, "/files", token, params)
            for f in data.get("files") or []:
                fid = f.get("id", "")
                name = f.get("name", "")
                ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
                if fid in imported_ids:
                    continue
                if ext not in SUPPORTED_EXTENSIONS:
                    continue
                results.append(f)
            page_token = data.get("nextPageToken")
            if not page_token:
                break
    return results


async def download_file(token: str, file_id: str) -> bytes:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.get(
            f"{DRIVE_API}/files/{file_id}",
            headers={"Authorization": f"Bearer {token}"},
            params={"alt": "media"},
        )
        resp.raise_for_status()
        return resp.content


def guess_content_type(filename: str, drive_mime: str = "") -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in MIME_MAP:
        return MIME_MAP[ext]
    if drive_mime and drive_mime != "application/octet-stream":
        return drive_mime
    return "application/octet-stream"