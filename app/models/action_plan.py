"""
Action Plan database models
"""
from sqlalchemy import Column, String, DateTime, Text, JSON, Enum as SQLEnum, ForeignKey, Integer
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class ActionStatus(str, enum.Enum):
    """Action status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    ESCALATED = "escalated"
    BLOCKED = "blocked"


class ActionPlan(Base):
    """Action plan generated from directives"""
    __tablename__ = "action_plans"
    
    id = Column(String(50), primary_key=True, index=True)
    judgment_id = Column(String(50), ForeignKey("judgments.id"), nullable=False, index=True)
    
    # Plan details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Department assignment
    department_id = Column(String(50), nullable=False, index=True)
    department_name = Column(String(100), nullable=False)
    assigned_officer_id = Column(String(50))
    assigned_officer_name = Column(String(100))
    
    # Timeline
    deadline = Column(DateTime, nullable=False)
    estimated_completion_date = Column(DateTime)
    actual_completion_date = Column(DateTime)
    
    # Status
    status = Column(SQLEnum(ActionStatus), default=ActionStatus.PENDING)
    progress_percentage = Column(Integer, default=0)
    
    # Priority and risk
    priority = Column(String(50), nullable=False)
    risk_level = Column(String(50))
    compliance_risk_score = Column(Integer)
    
    # Related directives
    directive_ids = Column(JSON)  # List of directive IDs
    
    # Action items
    action_items = Column(JSON)  # List of specific action items
    
    # Compliance
    compliance_requirements = Column(JSON)
    compliance_checklist = Column(JSON)
    
    # Appeal recommendation
    appeal_recommended = Column(String(10))  # yes/no/maybe
    appeal_probability = Column(Integer)  # 0-100
    appeal_reasoning = Column(Text)
    similar_cases = Column(JSON)  # Similar case references
    
    # Tracking
    last_update_by = Column(String(100))
    last_update_notes = Column(Text)
    
    # Audit trail
    audit_log = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ActionPlan {self.id} - {self.department_name}>"
