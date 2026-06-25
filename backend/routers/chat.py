"""
AI Chat endpoints with context retrieval and map awareness.
"""
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from routers.auth import get_current_user
from database import get_supabase
from services.ai_service import chat_with_ai, SURVEY_KNOWLEDGE_BASE

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    project_id: Optional[str] = None
    file_ids: list[str] = []
    map_context: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    commands: list[dict] = []
    rag_sources: list[dict] = []


@router.get("/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    """List chat sessions for current user."""
    supabase = get_supabase()
    result = supabase.table("chat_sessions") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .order("updated_at", desc=True) \
        .execute()
    return result.data


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    """Get a chat session with messages."""
    supabase = get_supabase()
    session = supabase.table("chat_sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("user_id", user["id"]) \
        .execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = supabase.table("chat_messages") \
        .select("*") \
        .eq("session_id", session_id) \
        .order("created_at", desc=False) \
        .execute()

    return {"session": session.data[0], "messages": messages.data}


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    """Send a message to the AI and get a response."""
    supabase = get_supabase()

    # Get or create session
    if req.session_id:
        session = supabase.table("chat_sessions") \
            .select("*") \
            .eq("id", req.session_id) \
            .eq("user_id", user["id"]) \
            .execute()
        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")
        session_id = req.session_id
    else:
        result = supabase.table("chat_sessions").insert({
            "user_id": user["id"],
            "project_id": req.project_id,
            "title": req.message[:60] + ("..." if len(req.message) > 60 else ""),
        }).execute()
        session_id = result.data[0]["id"]

    # Get file contexts
    file_contexts = []
    if req.file_ids:
        for fid in req.file_ids:
            analysis = supabase.table("analysis_results") \
                .select("*") \
                .eq("file_id", fid) \
                .execute()
            if analysis.data:
                a = analysis.data[0]
                file_contexts.append({
                    "filename": fid,
                    "summary": a.get("summary", ""),
                    "warnings": a.get("warnings", []),
                    "insights": a.get("insights", []),
                    "text_snippet": (a.get("extracted_text", "") or "")[:3000],
                })

    # Get conversation history
    history = supabase.table("chat_messages") \
        .select("role,content") \
        .eq("session_id", session_id) \
        .order("created_at", desc=False) \
        .limit(20) \
        .execute()

    # Retrieve relevant knowledge base entries
    rag_sources = []
    q = req.message.lower()
    for doc in SURVEY_KNOWLEDGE_BASE:
        score = sum(3 for tag in doc["tags"] if tag in q)
        if score > 0:
            rag_sources.append({"id": doc["id"], "tags": doc["tags"]})

    # Call AI
    ai_response = await chat_with_ai(
        message=req.message,
        history=history.data or [],
        file_contexts=file_contexts,
        map_context=req.map_context,
        rag_sources=rag_sources,
    )

    # Parse commands from AI response
    reply_text = ai_response.get("reply", "")
    commands = []
    json_match = None
    import re
    match = re.search(r"```json\s*({[\s\S]*?})\s*```", reply_text)
    if match:
        try:
            parsed = json.loads(match.group(1))
            if "commands" in parsed and isinstance(parsed["commands"], list):
                commands = parsed["commands"]
                reply_text = reply_text.replace(match.group(0), "").strip()
        except json.JSONDecodeError:
            pass

    # Save messages
    supabase.table("chat_messages").insert({
        "user_id": user["id"],
        "session_id": session_id,
        "role": "user",
        "content": req.message,
    }).execute()

    supabase.table("chat_messages").insert({
        "user_id": user["id"],
        "session_id": session_id,
        "role": "assistant",
        "content": reply_text,
        "commands": commands,
        "file_ids": req.file_ids,
    }).execute()

    # Update session
    supabase.table("chat_sessions").update({
        "message_count": len(history.data or []) + 2,
        "updated_at": "now()",
    }).eq("id", session_id).execute()

    return ChatResponse(
        reply=reply_text,
        session_id=session_id,
        commands=commands,
        rag_sources=rag_sources,
    )


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    """Delete a chat session and its messages."""
    supabase = get_supabase()
    supabase.table("chat_messages").delete().eq("session_id", session_id).execute()
    supabase.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user["id"]).execute()
    return {"ok": True}
