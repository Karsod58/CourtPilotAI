"""
Deadlines API endpoints
Calculate and track deadlines from directives and action plans
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
from loguru import logger

from app.core.database import get_db
from app.models.directive import Directive
from app.models.action_plan import ActionPlan, ActionStatus
from app.models.judgment import Judgment

router = APIRouter()


@router.get("/")
async def get_all_deadlines(
    upcoming_days: int = Query(30, ge=1, le=365),
    include_completed: bool = False,
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all deadlines from directives and action plans
    """
    try:
        deadlines = []
        
        # Get deadlines from directives
        directive_query = select(Directive).where(Directive.deadline.isnot(None))
        
        if not include_completed:
            directive_query = directive_query.where(Directive.compliance_status != 'completed')
        
        if department:
            directive_query = directive_query.where(
                or_(
                    Directive.assigned_department == department,
                    Directive.responsible_entity == department
                )
            )
        
        directive_result = await db.execute(directive_query)
        directives = directive_result.scalars().all()
        
        for directive in directives:
            if directive.deadline:
                deadline_date = directive.deadline if isinstance(directive.deadline, datetime) else datetime.fromisoformat(str(directive.deadline))
                days_until = (deadline_date - datetime.utcnow()).days
                
                if days_until <= upcoming_days or days_until < 0:
                    deadlines.append({
                        'id': directive.id,
                        'type': 'directive',
                        'title': directive.directive_text[:100] + '...' if len(directive.directive_text) > 100 else directive.directive_text,
                        'description': directive.directive_text,
                        'deadline': deadline_date.isoformat(),
                        'days_until': days_until,
                        'is_overdue': days_until < 0,
                        'status': directive.compliance_status or 'pending',
                        'priority': directive.priority,
                        'department': directive.assigned_department or directive.responsible_entity,
                        'judgment_id': directive.judgment_id,
                        'confidence_score': directive.confidence_score
                    })
        
        # Get deadlines from action plans
        action_query = select(ActionPlan)
        
        if not include_completed:
            action_query = action_query.where(ActionPlan.status != ActionStatus.COMPLETED)
        
        if department:
            action_query = action_query.where(ActionPlan.department_name == department)
        
        action_result = await db.execute(action_query)
        action_plans = action_result.scalars().all()
        
        for action_plan in action_plans:
            if action_plan.deadline:
                deadline_date = action_plan.deadline
                days_until = (deadline_date - datetime.utcnow()).days
                
                if days_until <= upcoming_days or days_until < 0:
                    deadlines.append({
                        'id': action_plan.id,
                        'type': 'action_plan',
                        'title': action_plan.title,
                        'description': action_plan.description,
                        'deadline': deadline_date.isoformat(),
                        'days_until': days_until,
                        'is_overdue': days_until < 0,
                        'status': action_plan.status.value,
                        'priority': action_plan.priority,
                        'department': action_plan.department_name,
                        'judgment_id': action_plan.judgment_id,
                        'progress_percentage': action_plan.progress_percentage
                    })
        
        # Sort by deadline (soonest first)
        deadlines.sort(key=lambda x: x['deadline'])
        
        # Calculate statistics
        total = len(deadlines)
        overdue = sum(1 for d in deadlines if d['is_overdue'])
        due_this_week = sum(1 for d in deadlines if 0 <= d['days_until'] <= 7)
        due_this_month = sum(1 for d in deadlines if 0 <= d['days_until'] <= 30)
        
        return {
            'total': total,
            'overdue': overdue,
            'due_this_week': due_this_week,
            'due_this_month': due_this_month,
            'items': deadlines
        }
        
    except Exception as e:
        logger.error(f"Error getting deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue")
async def get_overdue_deadlines(
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all overdue deadlines
    """
    try:
        deadlines = []
        
        # Get overdue directives
        directive_query = select(Directive).where(
            and_(
                Directive.deadline.isnot(None),
                Directive.deadline < datetime.utcnow(),
                Directive.compliance_status != 'completed'
            )
        )
        
        if department:
            directive_query = directive_query.where(
                or_(
                    Directive.assigned_department == department,
                    Directive.responsible_entity == department
                )
            )
        
        directive_result = await db.execute(directive_query)
        directives = directive_result.scalars().all()
        
        for directive in directives:
            deadline_date = directive.deadline if isinstance(directive.deadline, datetime) else datetime.fromisoformat(str(directive.deadline))
            days_overdue = (datetime.utcnow() - deadline_date).days
            
            deadlines.append({
                'id': directive.id,
                'type': 'directive',
                'title': directive.directive_text[:100] + '...',
                'deadline': deadline_date.isoformat(),
                'days_overdue': days_overdue,
                'status': directive.compliance_status or 'pending',
                'priority': directive.priority,
                'department': directive.assigned_department or directive.responsible_entity,
                'judgment_id': directive.judgment_id
            })
        
        # Get overdue action plans
        action_query = select(ActionPlan).where(
            and_(
                ActionPlan.deadline < datetime.utcnow(),
                ActionPlan.status != ActionStatus.COMPLETED
            )
        )
        
        if department:
            action_query = action_query.where(ActionPlan.department_name == department)
        
        action_result = await db.execute(action_query)
        action_plans = action_result.scalars().all()
        
        for action_plan in action_plans:
            days_overdue = (datetime.utcnow() - action_plan.deadline).days
            
            deadlines.append({
                'id': action_plan.id,
                'type': 'action_plan',
                'title': action_plan.title,
                'deadline': action_plan.deadline.isoformat(),
                'days_overdue': days_overdue,
                'status': action_plan.status.value,
                'priority': action_plan.priority,
                'department': action_plan.department_name,
                'judgment_id': action_plan.judgment_id,
                'progress_percentage': action_plan.progress_percentage
            })
        
        # Sort by days overdue (most overdue first)
        deadlines.sort(key=lambda x: x['days_overdue'], reverse=True)
        
        return {
            'total': len(deadlines),
            'items': deadlines
        }
        
    except Exception as e:
        logger.error(f"Error getting overdue deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming")
async def get_upcoming_deadlines(
    days: int = Query(7, ge=1, le=90),
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get upcoming deadlines within specified days
    """
    try:
        future_date = datetime.utcnow() + timedelta(days=days)
        deadlines = []
        
        # Get upcoming directives
        directive_query = select(Directive).where(
            and_(
                Directive.deadline.isnot(None),
                Directive.deadline >= datetime.utcnow(),
                Directive.deadline <= future_date,
                Directive.compliance_status != 'completed'
            )
        )
        
        if department:
            directive_query = directive_query.where(
                or_(
                    Directive.assigned_department == department,
                    Directive.responsible_entity == department
                )
            )
        
        directive_result = await db.execute(directive_query)
        directives = directive_result.scalars().all()
        
        for directive in directives:
            deadline_date = directive.deadline if isinstance(directive.deadline, datetime) else datetime.fromisoformat(str(directive.deadline))
            days_until = (deadline_date - datetime.utcnow()).days
            
            deadlines.append({
                'id': directive.id,
                'type': 'directive',
                'title': directive.directive_text[:100] + '...',
                'deadline': deadline_date.isoformat(),
                'days_until': days_until,
                'status': directive.compliance_status or 'pending',
                'priority': directive.priority,
                'department': directive.assigned_department or directive.responsible_entity,
                'judgment_id': directive.judgment_id
            })
        
        # Get upcoming action plans
        action_query = select(ActionPlan).where(
            and_(
                ActionPlan.deadline >= datetime.utcnow(),
                ActionPlan.deadline <= future_date,
                ActionPlan.status != ActionStatus.COMPLETED
            )
        )
        
        if department:
            action_query = action_query.where(ActionPlan.department_name == department)
        
        action_result = await db.execute(action_query)
        action_plans = action_result.scalars().all()
        
        for action_plan in action_plans:
            days_until = (action_plan.deadline - datetime.utcnow()).days
            
            deadlines.append({
                'id': action_plan.id,
                'type': 'action_plan',
                'title': action_plan.title,
                'deadline': action_plan.deadline.isoformat(),
                'days_until': days_until,
                'status': action_plan.status.value,
                'priority': action_plan.priority,
                'department': action_plan.department_name,
                'judgment_id': action_plan.judgment_id,
                'progress_percentage': action_plan.progress_percentage
            })
        
        # Sort by deadline (soonest first)
        deadlines.sort(key=lambda x: x['deadline'])
        
        return {
            'total': len(deadlines),
            'days': days,
            'items': deadlines
        }
        
    except Exception as e:
        logger.error(f"Error getting upcoming deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/department/{department_name}")
async def get_department_deadlines(
    department_name: str,
    include_completed: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all deadlines for a specific department
    """
    try:
        deadlines = []
        
        # Get directives for department
        directive_query = select(Directive).where(
            and_(
                Directive.deadline.isnot(None),
                or_(
                    Directive.assigned_department == department_name,
                    Directive.responsible_entity == department_name
                )
            )
        )
        
        if not include_completed:
            directive_query = directive_query.where(Directive.compliance_status != 'completed')
        
        directive_result = await db.execute(directive_query)
        directives = directive_result.scalars().all()
        
        for directive in directives:
            deadline_date = directive.deadline if isinstance(directive.deadline, datetime) else datetime.fromisoformat(str(directive.deadline))
            days_until = (deadline_date - datetime.utcnow()).days
            
            deadlines.append({
                'id': directive.id,
                'type': 'directive',
                'title': directive.directive_text[:100] + '...',
                'deadline': deadline_date.isoformat(),
                'days_until': days_until,
                'is_overdue': days_until < 0,
                'status': directive.compliance_status or 'pending',
                'priority': directive.priority,
                'judgment_id': directive.judgment_id
            })
        
        # Get action plans for department
        action_query = select(ActionPlan).where(
            ActionPlan.department_name == department_name
        )
        
        if not include_completed:
            action_query = action_query.where(ActionPlan.status != ActionStatus.COMPLETED)
        
        action_result = await db.execute(action_query)
        action_plans = action_result.scalars().all()
        
        for action_plan in action_plans:
            days_until = (action_plan.deadline - datetime.utcnow()).days
            
            deadlines.append({
                'id': action_plan.id,
                'type': 'action_plan',
                'title': action_plan.title,
                'deadline': action_plan.deadline.isoformat(),
                'days_until': days_until,
                'is_overdue': days_until < 0,
                'status': action_plan.status.value,
                'priority': action_plan.priority,
                'judgment_id': action_plan.judgment_id,
                'progress_percentage': action_plan.progress_percentage
            })
        
        # Sort by deadline
        deadlines.sort(key=lambda x: x['deadline'])
        
        # Calculate statistics
        total = len(deadlines)
        overdue = sum(1 for d in deadlines if d['is_overdue'])
        upcoming = sum(1 for d in deadlines if not d['is_overdue'])
        
        return {
            'department': department_name,
            'total': total,
            'overdue': overdue,
            'upcoming': upcoming,
            'items': deadlines
        }
        
    except Exception as e:
        logger.error(f"Error getting department deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_deadline_statistics(
    db: AsyncSession = Depends(get_db)
):
    """
    Get deadline statistics and metrics
    """
    try:
        # Get all directives with deadlines
        directive_result = await db.execute(
            select(Directive).where(Directive.deadline.isnot(None))
        )
        directives = directive_result.scalars().all()
        
        # Get all action plans
        action_result = await db.execute(select(ActionPlan))
        action_plans = action_result.scalars().all()
        
        # Calculate statistics
        total_deadlines = len(directives) + len(action_plans)
        
        overdue_directives = sum(
            1 for d in directives 
            if d.deadline < datetime.utcnow() and d.status != 'completed'
        )
        overdue_actions = sum(
            1 for a in action_plans 
            if a.deadline < datetime.utcnow() and a.status != ActionStatus.COMPLETED
        )
        total_overdue = overdue_directives + overdue_actions
        
        completed_directives = sum(1 for d in directives if d.status == 'completed')
        completed_actions = sum(1 for a in action_plans if a.status == ActionStatus.COMPLETED)
        total_completed = completed_directives + completed_actions
        
        # Calculate compliance rate
        compliance_rate = 0
        if total_deadlines > 0:
            compliance_rate = round((total_completed / total_deadlines) * 100, 2)
        
        # Get upcoming deadlines (next 7 days)
        future_date = datetime.utcnow() + timedelta(days=7)
        upcoming_directives = sum(
            1 for d in directives 
            if datetime.utcnow() <= d.deadline <= future_date and d.status != 'completed'
        )
        upcoming_actions = sum(
            1 for a in action_plans 
            if datetime.utcnow() <= a.deadline <= future_date and a.status != ActionStatus.COMPLETED
        )
        upcoming_this_week = upcoming_directives + upcoming_actions
        
        return {
            'total_deadlines': total_deadlines,
            'total_overdue': total_overdue,
            'total_completed': total_completed,
            'compliance_rate': compliance_rate,
            'upcoming_this_week': upcoming_this_week,
            'by_type': {
                'directives': {
                    'total': len(directives),
                    'overdue': overdue_directives,
                    'completed': completed_directives
                },
                'action_plans': {
                    'total': len(action_plans),
                    'overdue': overdue_actions,
                    'completed': completed_actions
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting deadline statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
