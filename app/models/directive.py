"""
Directive database models
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Float, JSON, Enum as SQLEnum, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class DirectiveType(str, enum.Enum):
    """Directive type enumeration"""
    MANDATORY = "mandatory"
    ADVISORY = "advisory"
    CONDITIONAL = "conditional"
    IMMEDIATE = "immediate"
    PERIODIC = "periodic"


class Priority(str, enum.Enum):
    """Priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class VerificationStatus(str, enum.Enum):
    """Verification status"""
    PENDING = "pending"
    APPROVED = "approved"
    EDITED = "edited"
    REJECTED = "rejected"


class Directive(Base):
    """Directive extracted from judgment"""
    __tablename__ = "directives"
    
    id = Column(String(50), primary_key=True, index=True)
    judgment_id = Column(String(50), ForeignKey("judgments.id"), nullable=False, index=True)
    
    # Directive content
    directive_text = Column(Text, nullable=False)
    directive_type = Column(SQLEnum(DirectiveType), nullable=False)
    priority = Column(SQLEnum(Priority), default=Priority.MEDIUM)
    
    # AI Extraction metadata
    confidence_score = Column(Float, nullable=False)
    source_page_number = Column(Integer)
    source_paragraph = Column(Integer)
    source_text_highlight = Column(Text)  # Original text from PDF
    
    # Extracted entities
    action_required = Column(Text)
    responsible_entity = Column(String(255))
    deadline = Column(DateTime)
    deadline_text = Column(String(255))  # Original deadline text
    
    # Department assignment
    assigned_department = Column(String(100))
    assigned_officer = Column(String(100))
    assignment_confidence = Column(Float)
    
    # Verification
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.PENDING)
    verified_by = Column(String(100))
    verified_at = Column(DateTime)
    verification_notes = Column(Text)
    
    # Original vs Edited
    original_directive_text = Column(Text)
    is_edited = Column(Boolean, default=False)
    
    # Compliance tracking
    compliance_status = Column(String(50))
    compliance_deadline = Column(DateTime)
    days_until_deadline = Column(Integer)
    
    # Directive metadata (renamed from 'metadata' to avoid SQLAlchemy reserved word)
    directive_metadata = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Directive {self.id} - {self.directive_type}>"
