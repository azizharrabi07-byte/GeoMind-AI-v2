"""
Configuration management using Pydantic Settings.
Reads from environment variables or .env file.
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # AI Provider
    gemini_api_key: str = ""

    # Google Drive OAuth (Phase 4)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3001/api/integrations/google_drive/oauth/callback"

    # Microsoft Graph OAuth (Phase 4b — OneDrive + Outlook)
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_onedrive_redirect_uri: str = "http://localhost:3001/api/integrations/onedrive/oauth/callback"
    microsoft_outlook_redirect_uri: str = "http://localhost:3001/api/integrations/outlook/oauth/callback"

    # App
    app_url: str = "http://localhost:5173"
    node_env: str = "development"
    port: int = 3000

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Supabase JWT
    @property
    def supabase_jwt_algorithm(self) -> str:
        return "HS256"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()

# Validate critical settings
if not settings.supabase_url or not settings.supabase_anon_key:
    raise ValueError(
        "Missing Supabase credentials. "
        "Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file."
    )
