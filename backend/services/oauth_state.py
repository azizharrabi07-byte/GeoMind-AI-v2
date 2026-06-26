"""Signed OAuth state tokens shared across integration providers."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Optional

from config import settings


def _state_secret() -> str:
    return (
        settings.supabase_service_role_key
        or settings.google_client_secret
        or settings.microsoft_client_secret
        or "geomind-oauth"
    )


def make_oauth_state(user_id: str, extra: Optional[dict[str, Any]] = None) -> str:
    payload = json.dumps({"uid": user_id, "ts": int(time.time()), **(extra or {})})
    sig = hmac.new(_state_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    raw = f"{payload}|{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def verify_oauth_state(state: str, max_age_sec: int = 600) -> Optional[dict[str, Any]]:
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
        return data
    except Exception:
        return None