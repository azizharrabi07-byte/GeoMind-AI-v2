"""
Models package — Pydantic schemas.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class ProjectSchema(BaseModel):
    id: str = ""
    user_id: str = ""
    name: str
    description: str = ""
    status: str = "active"
    client_name: str = ""
    location: str = ""
    coordinate_system: str = ""
    progress: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FileSchema(BaseModel):
    id: str = ""
    user_id: str = ""
    project_id: Optional[str] = None
    filename: str
    file_ext: str = ""
    file_size: int = 0
    status: str = "uploaded"
    created_at: Optional[datetime] = None


class ChatMessageSchema(BaseModel):
    id: str = ""
    session_id: str = ""
    role: str  # user, assistant
    content: str
    commands: list = []
    created_at: Optional[datetime] = None


class GISFeatureSchema(BaseModel):
    id: str = ""
    user_id: str = ""
    project_id: Optional[str] = None
    feature_type: str  # point, line, polygon
    geometry: dict
    label: str = ""
    created_at: Optional[datetime] = None