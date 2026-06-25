"""
GeoMind AI — Main Application Entry
FastAPI backend for survey engineering intelligence platform
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import auth, projects, files, chat, gis, reports, integrations, activities

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("geomind")

app = FastAPI(
    title="GeoMind AI API",
    description="Backend for the Survey Engineering Intelligence Platform",
    version="2.0.0",
)

# CORS — restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(gis.router, prefix="/api/gis", tags=["GIS"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])
app.include_router(activities.router, prefix="/api/activities", tags=["Activities"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "2.0.0", "service": "GeoMind AI"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
