"""
Authentication router — Sign up, login, profile management.
"""
import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_supabase, get_user_from_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer(auto_error=False)

def _dev_user() -> dict:
    uid = os.getenv("DEV_USER_ID", "")
    if not uid:
        raise HTTPException(
            status_code=503,
            detail="DEV_USER_ID not set. Run: python seed_demo.py",
        )
    return {
        "id": uid,
        "email": "demo@geomind.ai",
        "user_metadata": {"full_name": "Demo Surveyor"},
    }


class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class SignInRequest(BaseModel):
    email: str
    password: str


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    license_number: str | None = None
    firm_name: str | None = None
    default_crs: str | None = None
    report_template: str | None = None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency: extract current user from JWT token."""
    if os.getenv("ALLOW_DEV_AUTH", "false").lower() == "true" and not credentials:
        return _dev_user()
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_user_from_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.post("/signup")
async def sign_up(req: SignUpRequest):
    """Register a new user with email and password."""
    supabase = get_supabase()
    try:
        result = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"full_name": req.full_name}},
        })
        return {
            "user": result.user.model_dump() if result.user else None,
            "session": result.session.model_dump() if result.session else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
async def sign_in(req: SignInRequest):
    """Sign in with email and password."""
    supabase = get_supabase()
    try:
        result = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })
        return {
            "user": result.user.model_dump() if result.user else None,
            "session": result.session.model_dump() if result.session else None,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/google")
async def google_sign_in(token: str):
    """Sign in with Google OAuth token."""
    supabase = get_supabase()
    try:
        result = supabase.auth.sign_in_with_id_token({
            "provider": "google",
            "token": token,
        })
        return {
            "user": result.user.model_dump() if result.user else None,
            "session": result.session.model_dump() if result.session else None,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    supabase = get_supabase()
    result = supabase.table("profiles").select("*").eq("id", user["id"]).execute()
    if result.data:
        return result.data[0]
    return user


@router.put("/me")
async def update_me(update: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update current user profile."""
    supabase = get_supabase()
    data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    data["updated_at"] = "now()"
    result = supabase.table("profiles").update(data).eq("id", user["id"]).execute()
    if result.data:
        return result.data[0]
    raise HTTPException(status_code=500, detail="Update failed")