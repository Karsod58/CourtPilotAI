"""
Judgment database models
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Float, JSON, Enum as SQLEnum
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.core.database import Base


class CaseType(str, enum.Enum):
    """Case type enumeration"""
    CIVIL = "civil"
    CRIMINAL = "criminal"
    CONSTITUTIONAL = "constitutional"
    SPECIAL = "special"
    OTHER = "other"


class ProcessingStatus(str, enum.Enum):
    """Processing status enumeration"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    VERIFIED = "verified"
    ACTION_PLAN_READY = "action_plan_ready"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ESCALATED = "escalated"
    FAILED = "failed"


class Judgment(Base):
    """Judgment model for PostgreSQL"""
    __tablename__ = "judgments"
    
    id = Column(String(50), primary_key=True, index=True)
    case_id = Column(String(100), unique=True, index=True, nullable=False)
    case_type = Column(SQLEnum(CaseType), nullable=False)
    court_name = Column(String(255), nullable=False)
    judge_name = Column(String(255))
    
    # Document information
    document_path = Column(String(500), nullable=False)
    document_hash = Column(String(64), unique=True)
    file_size = Column(Integer)
    page_count = Column(Integer)
    
    # Dates
    judgment_date = Column(DateTime)
    uploaded_at = Column(DateTime, default=func.now())
    processed_at = Column(DateTime)
    
    # Processing status
    status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.UPLOADED)
    
    # Extracted content (using LONGTEXT for large judgment documents)
    raw_text = Column(LONGTEXT)
    summary = Column(LONGTEXT)
    
    # Case metadata (renamed from 'metadata' to avoid SQLAlchemy reserved word)
    case_metadata = Column(JSON)
    
    # Parties involved
    petitioner = Column(String(255))
    respondent = Column(String(255))
    
    # Department information
    departments_involved = Column(JSON)  # List of department IDs
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # User tracking
    uploaded_by = Column(String(100))
    verified_by = Column(String(100))
    
    def __repr__(self):
        return f"<Judgment {self.case_id}>"
