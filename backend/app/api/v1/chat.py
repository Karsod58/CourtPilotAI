"""
AI Chat Assistant API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from loguru import logger

from app.core.database import get_db
from app.services.chat_service import chat_service

router = APIRouter()


# Pydantic schemas
class ChatSessionCreate(BaseModel):
    """Create chat session request"""
    judgment_id: Optional[str] = None
    context_type: str = "general"


class ChatSessionResponse(BaseModel):
    """Chat session response"""
    id: str
    user_id: str
    user_name: str
    judgment_id: Optional[str]
    context_type: str
    title: str
    is_active: bool
    created_at: datetime
    last_message_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ChatMessageRequest(BaseModel):
    """Chat message request"""
    message: str


class ChatMessageResponse(BaseModel):
    """Chat message response"""
    id: str
    session_id: str
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]]
    created_at: datetime
    helpful: Optional[bool]
    
    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    """Chat API response"""
    message_id: str
    content: str
    sources: Optional[List[Dict[str, Any]]]
    timestamp: datetime


class FeedbackRequest(BaseModel):
    """Feedback request"""
    helpful: bool
    notes: Optional[str] = None


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_chat_session(
    session_data: ChatSessionCreate,
    user_id: str = Query(..., description="User ID"),  # TODO: Get from auth
    user_name: str = Query("Official", description="User name"),  # TODO: Get from auth
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new chat session
    
    - **judgment_id**: Optional judgment ID for context-specific chat
    - **context_type**: Type of context (judgment, directive, general)
    """
    try:
        session = await chat_service.create_session(
            db=db,
            user_id=user_id,
            user_name=user_name,
            judgment_id=session_data.judgment_id,
            context_type=session_data.context_type
        )
        return session
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    user_id: str = Query(..., description="User ID"),  # TODO: Get from auth
    active_only: bool = Query(True, description="Show only active sessions"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all chat sessions for the current user
    
    - **active_only**: Filter for active sessions only
    """
    try:
        sessions = await chat_service.get_user_sessions(
            db=db,
            user_id=user_id,
            active_only=active_only
        )
        return sessions
    except Exception as e:
        logger.error(f"Error listing chat sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific chat session
    
    - **session_id**: Chat session ID
    """
    try:
        session = await chat_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_chat_message(
    session_id: str,
    message_data: ChatMessageRequest,
    user_id: str = Query(..., description="User ID"),  # TODO: Get from auth
    use_rag: bool = Query(True, description="Use RAG for context retrieval"),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message in a chat session and get AI response
    
    - **session_id**: Chat session ID
    - **message**: User's message/question
    - **use_rag**: Whether to use RAG for context retrieval (default: True)
    
    The AI will respond based on:
    - RAG-retrieved context from all judgments and directives (if use_rag=True)
    - Conversation history
    - Judgment context (if session is judgment-specific)
    - Extracted directives and compliance information
    """
    try:
        response = await chat_service.chat_with_rag(
            db=db,
            session_id=session_id,
            user_message=message_data.message,
            user_id=user_id,
            use_rag=use_rag
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    session_id: str,
    limit: Optional[int] = Query(None, description="Limit number of messages"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all messages in a chat session
    
    - **session_id**: Chat session ID
    - **limit**: Optional limit on number of messages
    """
    try:
        messages = await chat_service.get_session_messages(
            db=db,
            session_id=session_id,
            limit=limit
        )
        return messages
    except Exception as e:
        logger.error(f"Error getting chat messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/{message_id}/feedback")
async def provide_message_feedback(
    message_id: str,
    feedback: FeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Provide feedback on an AI response
    
    - **message_id**: Message ID
    - **helpful**: Whether the response was helpful
    - **notes**: Optional feedback notes
    """
    try:
        message = await chat_service.provide_feedback(
            db=db,
            message_id=message_id,
            helpful=feedback.helpful,
            notes=feedback.notes
        )
        return {
            "message_id": message.id,
            "feedback_recorded": True,
            "helpful": message.helpful
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error providing feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/close")
async def close_chat_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Close a chat session
    
    - **session_id**: Chat session ID
    """
    try:
        session = await chat_service.close_session(db, session_id)
        return {
            "session_id": session.id,
            "closed": True,
            "is_active": session.is_active
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error closing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/judgments/{judgment_id}/summarize")
async def summarize_judgment(
    judgment_id: str,
    user_id: str = Query(..., description="User ID"),  # TODO: Get from auth
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a summary of a judgment
    
    - **judgment_id**: Judgment ID to summarize
    
    Returns a concise summary highlighting:
    - Key facts
    - Main legal issues
    - Court's decision
    - Important directives
    - Compliance requirements
    """
    try:
        summary = await chat_service.summarize_judgment_chat(
            db=db,
            judgment_id=judgment_id,
            user_id=user_id
        )
        return {
            "judgment_id": judgment_id,
            "summary": summary
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error summarizing judgment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-query")
async def quick_query(
    message_data: ChatMessageRequest,
    judgment_id: Optional[str] = Query(None, description="Optional judgment context"),
    user_id: str = Query(..., description="User ID"),  # TODO: Get from auth
    db: AsyncSession = Depends(get_db)
):
    """
    Quick query without creating a session (for one-off questions)
    
    - **message**: Question to ask
    - **judgment_id**: Optional judgment ID for context
    
    Use this for quick questions that don't need conversation history.
    For multi-turn conversations, create a session instead.
    """
    try:
        # Get context if judgment provided
        context = ""
        if judgment_id:
            context = await chat_service.get_judgment_context(db, judgment_id)
        
        # Get AI response
        from app.services.ai.llm_service import llm_service
        response = await llm_service.answer_question(
            question=message_data.message,
            context=context,
            conversation_history=None
        )
        
        return {
            "question": message_data.message,
            "answer": response,
            "judgment_id": judgment_id
        }
    except Exception as e:
        logger.error(f"Error in quick query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

