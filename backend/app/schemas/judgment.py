"""
Judgment Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class CaseTypeEnum(str, Enum):
    CIVIL = "civil"
    CRIMINAL = "criminal"
    CONSTITUTIONAL = "constitutional"
    SPECIAL = "special"
    OTHER = "other"


class ProcessingStatusEnum(str, Enum):
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


class JudgmentUpload(BaseModel):
    """Schema for uploading a judgment"""
    case_id: str = Field(..., description="Unique case identifier")
    case_type: CaseTypeEnum
    court_name: str
    judge_name: Optional[str] = None
    judgment_date: Optional[datetime] = None
    petitioner: Optional[str] = None
    respondent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class JudgmentResponse(BaseModel):
    """Schema for judgment response"""
    id: str
    case_id: str
    case_type: str
    court_name: str
    judge_name: Optional[str]
    document_path: str
    page_count: Optional[int]
    judgment_date: Optional[datetime]
    uploaded_at: datetime
    processed_at: Optional[datetime]
    status: str
    summary: Optional[str]
    petitioner: Optional[str]
    respondent: Optional[str]
    departments_involved: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class JudgmentDetail(JudgmentResponse):
    """Detailed judgment response with extracted content"""
    raw_text: Optional[str]
    case_metadata: Optional[Dict[str, Any]] = None
    uploaded_by: Optional[str]
    verified_by: Optional[str]


class JudgmentList(BaseModel):
    """Paginated list of judgments"""
    total: int
    page: int
    page_size: int
    items: List[JudgmentResponse]


class JudgmentStats(BaseModel):
    """Judgment statistics"""
    total_judgments: int
    pending_actions: int
    completed_actions: int
    overdue_actions: int
    by_status: Dict[str, int]
    by_department: Dict[str, int]
    by_priority: Dict[str, int]
