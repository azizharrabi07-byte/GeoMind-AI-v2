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

    # App
    app_url: str = "http://localhost:3000"
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
