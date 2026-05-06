"""
Analytics API endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import Dict, List, Any
from loguru import logger

from app.core.database import get_db
from app.models.judgment import Judgment, ProcessingStatus, CaseType
from app.models.directive import Directive, Priority, VerificationStatus
from app.models.action_plan import ActionPlan, ActionStatus

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_analytics(db: AsyncSession = Depends(get_db)):
    """
    Get dashboard analytics and metrics
    """
    try:
        # Total judgments
        total_judgments_result = await db.execute(select(func.count(Judgment.id)))
        total_judgments = total_judgments_result.scalar() or 0
        
        # Judgments by status
        status_result = await db.execute(
            select(Judgment.status, func.count(Judgment.id))
            .group_by(Judgment.status)
        )
        status_distribution = {
            status.value: count for status, count in status_result.all()
        }
        
        # Total directives
        total_directives_result = await db.execute(select(func.count(Directive.id)))
        total_directives = total_directives_result.scalar() or 0
        
        # Directives by priority
        priority_result = await db.execute(
            select(Directive.priority, func.count(Directive.id))
            .group_by(Directive.priority)
        )
        priority_distribution = {
            priority.value: count for priority, count in priority_result.all()
        }
        
        # Directives by verification status
        verification_result = await db.execute(
            select(Directive.verification_status, func.count(Directive.id))
            .group_by(Directive.verification_status)
        )
        verification_distribution = {
            status.value: count for status, count in verification_result.all()
        }
        
        # Action plans by status
        action_status_result = await db.execute(
            select(ActionPlan.status, func.count(ActionPlan.id))
            .group_by(ActionPlan.status)
        )
        action_status_distribution = {
            status.value: count for status, count in action_status_result.all()
        }
        
        # Recent judgments (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_result = await db.execute(
            select(func.count(Judgment.id))
            .where(Judgment.uploaded_at >= seven_days_ago)
        )
        recent_judgments = recent_result.scalar() or 0
        
        # Pending verification count
        pending_verification = verification_distribution.get('pending', 0)
        
        # Overdue actions (simplified - checking deadlines)
        overdue_result = await db.execute(
            select(func.count(ActionPlan.id))
            .where(
                and_(
                    ActionPlan.deadline < datetime.now(),
                    ActionPlan.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
                )
            )
        )
        overdue_actions = overdue_result.scalar() or 0
        
        return {
            "total_judgments": total_judgments,
            "total_directives": total_directives,
            "pending_verification": pending_verification,
            "recent_judgments": recent_judgments,
            "overdue_actions": overdue_actions,
            "status_distribution": status_distribution,
            "priority_distribution": priority_distribution,
            "verification_distribution": verification_distribution,
            "action_status_distribution": action_status_distribution,
            "summary": {
                "active_cases": status_distribution.get('processing', 0) + status_distribution.get('extracted', 0),
                "completed_cases": status_distribution.get('completed', 0),
                "high_priority_directives": priority_distribution.get('high', 0) + priority_distribution.get('critical', 0),
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard analytics: {e}")
        return {
            "total_judgments": 0,
            "total_directives": 0,
            "pending_verification": 0,
            "recent_judgments": 0,
            "overdue_actions": 0,
            "status_distribution": {},
            "priority_distribution": {},
            "verification_distribution": {},
            "action_status_distribution": {},
            "summary": {
                "active_cases": 0,
                "completed_cases": 0,
                "high_priority_directives": 0,
            }
        }


@router.get("/compliance")
async def get_compliance_metrics(db: AsyncSession = Depends(get_db)):
    """
    Get compliance metrics
    """
    try:
        # Total action plans
        total_actions_result = await db.execute(select(func.count(ActionPlan.id)))
        total_actions = total_actions_result.scalar() or 0
        
        # Completed actions
        completed_result = await db.execute(
            select(func.count(ActionPlan.id))
            .where(ActionPlan.status == ActionStatus.COMPLETED)
        )
        completed_actions = completed_result.scalar() or 0
        
        # Overdue actions
        overdue_result = await db.execute(
            select(func.count(ActionPlan.id))
            .where(
                and_(
                    ActionPlan.deadline < datetime.now(),
                    ActionPlan.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
                )
            )
        )
        overdue_actions = overdue_result.scalar() or 0
        
        # In progress actions
        in_progress_result = await db.execute(
            select(func.count(ActionPlan.id))
            .where(ActionPlan.status == ActionStatus.IN_PROGRESS)
        )
        in_progress_actions = in_progress_result.scalar() or 0
        
        # Calculate compliance rate
        compliance_rate = (completed_actions / total_actions * 100) if total_actions > 0 else 0
        
        return {
            "total_actions": total_actions,
            "completed_actions": completed_actions,
            "in_progress_actions": in_progress_actions,
            "overdue_actions": overdue_actions,
            "pending_actions": total_actions - completed_actions - in_progress_actions - overdue_actions,
            "compliance_rate": round(compliance_rate, 2),
            "on_time_completion_rate": round((completed_actions / (completed_actions + overdue_actions) * 100) if (completed_actions + overdue_actions) > 0 else 0, 2)
        }
        
    except Exception as e:
        logger.error(f"Error getting compliance metrics: {e}")
        return {
            "total_actions": 0,
            "completed_actions": 0,
            "in_progress_actions": 0,
            "overdue_actions": 0,
            "pending_actions": 0,
            "compliance_rate": 0,
            "on_time_completion_rate": 0
        }


@router.get("/departments")
async def get_department_performance(db: AsyncSession = Depends(get_db)):
    """
    Get department-wise performance metrics
    """
    try:
        # Get action plans grouped by department
        dept_result = await db.execute(
            select(
                ActionPlan.department_name,
                func.count(ActionPlan.id).label('total'),
                func.sum(func.cast(ActionPlan.status == ActionStatus.COMPLETED, type_=func.Integer())).label('completed'),
                func.sum(func.cast(ActionPlan.status == ActionStatus.IN_PROGRESS, type_=func.Integer())).label('in_progress'),
                func.sum(func.cast(ActionPlan.status == ActionStatus.OVERDUE, type_=func.Integer())).label('overdue')
            )
            .group_by(ActionPlan.department_name)
        )
        
        departments = []
        for row in dept_result.all():
            dept_name, total, completed, in_progress, overdue = row
            completed = completed or 0
            in_progress = in_progress or 0
            overdue = overdue or 0
            
            departments.append({
                "department": dept_name,
                "total_actions": total,
                "completed": completed,
                "in_progress": in_progress,
                "overdue": overdue,
                "pending": total - completed - in_progress - overdue,
                "completion_rate": round((completed / total * 100) if total > 0 else 0, 2)
            })
        
        return {
            "departments": departments,
            "total_departments": len(departments)
        }
        
    except Exception as e:
        logger.error(f"Error getting department performance: {e}")
        return {
            "departments": [],
            "total_departments": 0
        }


@router.get("/trends")
async def get_trends(db: AsyncSession = Depends(get_db)):
    """
    Get trend analysis for the last 30 days
    """
    try:
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Judgments uploaded per day
        judgments_trend = await db.execute(
            select(
                func.date(Judgment.uploaded_at).label('date'),
                func.count(Judgment.id).label('count')
            )
            .where(Judgment.uploaded_at >= thirty_days_ago)
            .group_by(func.date(Judgment.uploaded_at))
            .order_by(func.date(Judgment.uploaded_at))
        )
        
        judgments_by_date = [
            {"date": str(date), "count": count}
            for date, count in judgments_trend.all()
        ]
        
        # Directives created per day
        directives_trend = await db.execute(
            select(
                func.date(Directive.created_at).label('date'),
                func.count(Directive.id).label('count')
            )
            .where(Directive.created_at >= thirty_days_ago)
            .group_by(func.date(Directive.created_at))
            .order_by(func.date(Directive.created_at))
        )
        
        directives_by_date = [
            {"date": str(date), "count": count}
            for date, count in directives_trend.all()
        ]
        
        return {
            "judgments_trend": judgments_by_date,
            "directives_trend": directives_by_date,
            "period": "last_30_days"
        }
        
    except Exception as e:
        logger.error(f"Error getting trends: {e}")
        return {
            "judgments_trend": [],
            "directives_trend": [],
            "period": "last_30_days"
        }
