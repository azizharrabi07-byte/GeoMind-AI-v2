"""
User preferences — AI toggles and notification email.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from routers.auth import get_current_user
from database import get_supabase

router = APIRouter()

DEFAULTS = {
    "auto_analyze_uploads": True,
    "proactive_flagging": True,
    "report_suggestions": False,
    "notification_email": "",
}


class PreferencesUpdate(BaseModel):
    auto_analyze_uploads: bool | None = None
    proactive_flagging: bool | None = None
    report_suggestions: bool | None = None
    notification_email: str | None = None


@router.get("/")
async def get_preferences(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    try:
        result = supabase.table("user_preferences").select("*").eq("user_id", user["id"]).execute()
        if result.data:
            return result.data[0]
    except Exception:
        pass
    return {"user_id": user["id"], **DEFAULTS}


@router.put("/")
async def update_preferences(req: PreferencesUpdate, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    data["user_id"] = user["id"]
    try:
        result = supabase.table("user_preferences").upsert(data).execute()
        if result.data:
            return result.data[0]
    except Exception:
        pass
    return {**DEFAULTS, **data}