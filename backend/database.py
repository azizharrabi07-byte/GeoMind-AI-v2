"""
Supabase client singleton and database utility functions.
"""
from supabase import create_client, Client
from config import settings

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Get or create Supabase client (singleton)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key or settings.supabase_anon_key,
        )
    return _supabase_client


def get_user_from_token(token: str) -> dict | None:
    """Verify JWT token and return user data."""
    try:
        client = get_supabase()
        user = client.auth.get_user(token)
        return user.user.model_dump() if user and user.user else None
    except Exception as e:
        return None
