"""
Chat database models for official queries
"""
from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.sql import func
from datetime import datetime

from app.core.database import Base


class ChatSession(Base):
    """Chat session for officials"""
    __tablename__ = "chat_sessions"
    
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    user_name = Column(String(100))
    
    # Session context
    judgment_id = Column(String(50), ForeignKey("judgments.id"), nullable=True, index=True)
    context_type = Column(String(50))  # judgment, directive, general
    
    # Session metadata
    title = Column(String(255))
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_message_at = Column(DateTime)
    
    def __repr__(self):
        return f"<ChatSession {self.id} - {self.user_name}>"


class ChatMessage(Base):
    """Individual chat messages"""
    __tablename__ = "chat_messages"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    
    # Message content
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    
    # Context and metadata
    context_used = Column(JSON)  # What context was used for this response
    confidence_score = Column(JSON)  # Confidence in the response
    sources = Column(JSON)  # Source references (judgment sections, directives)
    
    # Feedback
    helpful = Column(Boolean, nullable=True)  # User feedback
    feedback_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    def __repr__(self):
        return f"<ChatMessage {self.id} - {self.role}>"
