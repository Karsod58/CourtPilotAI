"""
Directive Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DirectiveTypeEnum(str, Enum):
    MANDATORY = "mandatory"
    ADVISORY = "advisory"
    CONDITIONAL = "conditional"
    IMMEDIATE = "immediate"
    PERIODIC = "periodic"


class PriorityEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class VerificationStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    EDITED = "edited"
    REJECTED = "rejected"


class DirectiveExtracted(BaseModel):
    """Schema for AI-extracted directive"""
    directive_text: str
    directive_type: DirectiveTypeEnum
    priority: PriorityEnum
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    source_page_number: Optional[int]
    source_paragraph: Optional[int]
    source_text_highlight: Optional[str]
    action_required: Optional[str]
    responsible_entity: Optional[str]
    deadline: Optional[datetime]
    deadline_text: Optional[str]
    assigned_department: Optional[str]
    assignment_confidence: Optional[float]
    metadata: Optional[Dict[str, Any]] = None


class DirectiveVerification(BaseModel):
    """Schema for human verification of directive"""
    verified: bool  # True to approve, False to reject
    verification_status: Optional[VerificationStatusEnum] = None
    directive_text: Optional[str] = None  # Edited text if modified
    directive_type: Optional[DirectiveTypeEnum] = None
    priority: Optional[PriorityEnum] = None
    action_required: Optional[str] = None
    responsible_entity: Optional[str] = None
    deadline: Optional[datetime] = None
    assigned_department: Optional[str] = None
    verification_notes: Optional[str] = None


class DirectiveResponse(BaseModel):
    """Schema for directive response"""
    id: str
    judgment_id: str
    directive_text: str
    directive_type: str
    priority: str
    confidence_score: float
    source_page_number: Optional[int]
    action_required: Optional[str]
    responsible_entity: Optional[str]
    deadline: Optional[datetime]
    deadline_text: Optional[str]
    assigned_department: Optional[str]
    assigned_officer: Optional[str]
    assignment_confidence: Optional[float]
    verification_status: str
    verified_by: Optional[str]
    verified_at: Optional[datetime]
    is_edited: bool
    compliance_status: Optional[str]
    days_until_deadline: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DirectiveList(BaseModel):
    """List of directives"""
    total: int
    items: List[DirectiveResponse]


class DirectiveWithHighlight(DirectiveResponse):
    """Directive with PDF highlight information"""
    source_text_highlight: Optional[str]
    verification_notes: Optional[str]
