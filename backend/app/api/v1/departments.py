"""
Departments API endpoints
Manage departments and their performance metrics
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from datetime import datetime, timedelta
from loguru import logger

from app.core.database import get_db
from app.models.directive import Directive
from app.models.action_plan import ActionPlan, ActionStatus
from app.models.judgment import Judgment

router = APIRouter()


# Predefined departments (in a real system, this would be in database)
DEPARTMENTS = [
    {
        'id': 'home',
        'name': 'Home Department',
        'description': 'Internal security, law and order, police administration',
        'head': 'Secretary, Home Department',
        'contact': 'home@gov.in'
    },
    {
        'id': 'finance',
        'name': 'Finance Department',
        'description': 'Financial management, budget allocation, treasury operations',
        'head': 'Secretary, Finance',
        'contact': 'finance@gov.in'
    },
    {
        'id': 'health',
        'name': 'Health Department',
        'description': 'Public health, medical services, disease control',
        'head': 'Secretary, Health',
        'contact': 'health@gov.in'
    },
    {
        'id': 'education',
        'name': 'Education Department',
        'description': 'School education, higher education, literacy programs',
        'head': 'Secretary, Education',
        'contact': 'education@gov.in'
    },
    {
        'id': 'pwd',
        'name': 'Public Works Department',
        'description': 'Infrastructure, roads, buildings, maintenance',
        'head': 'Chief Engineer, PWD',
        'contact': 'pwd@gov.in'
    },
    {
        'id': 'revenue',
        'name': 'Revenue Department',
        'description': 'Land records, revenue collection, disaster management',
        'head': 'Secretary, Revenue',
        'contact': 'revenue@gov.in'
    },
    {
        'id': 'transport',
        'name': 'Transport Department',
        'description': 'Public transport, vehicle registration, road safety',
        'head': 'Secretary, Transport',
        'contact': 'transport@gov.in'
    },
    {
        'id': 'environment',
        'name': 'Environment Department',
        'description': 'Environmental protection, pollution control, forests',
        'head': 'Secretary, Environment',
        'contact': 'environment@gov.in'
    }
]


@router.get("/")
async def get_all_departments(
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of all departments with basic statistics
    """
    try:
        departments_with_stats = []
        
        for dept in DEPARTMENTS:
            # Get directive count
            directive_result = await db.execute(
                select(func.count(Directive.id)).where(
                    or_(
                        Directive.assigned_department == dept['name'],
                        Directive.responsible_entity == dept['name']
                    )
                )
            )
            directive_count = directive_result.scalar() or 0
            
            # Get action plan count
            action_result = await db.execute(
                select(func.count(ActionPlan.id)).where(
                    ActionPlan.department_name == dept['name']
                )
            )
            action_count = action_result.scalar() or 0
            
            # Get overdue count
            overdue_result = await db.execute(
                select(func.count(ActionPlan.id)).where(
                    and_(
                        ActionPlan.department_name == dept['name'],
                        ActionPlan.deadline < datetime.utcnow(),
                        ActionPlan.status != ActionStatus.COMPLETED
                    )
                )
            )
            overdue_count = overdue_result.scalar() or 0
            
            departments_with_stats.append({
                **dept,
                'statistics': {
                    'total_directives': directive_count,
                    'total_action_plans': action_count,
                    'overdue_items': overdue_count
                }
            })
        
        return {
            'total': len(departments_with_stats),
            'items': departments_with_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting departments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{department_id}")
async def get_department_details(
    department_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific department
    """
    try:
        # Find department
        dept = next((d for d in DEPARTMENTS if d['id'] == department_id), None)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Get directives
        directive_result = await db.execute(
            select(Directive).where(
                or_(
                    Directive.assigned_department == dept['name'],
                    Directive.responsible_entity == dept['name']
                )
            )
        )
        directives = directive_result.scalars().all()
        
        # Get action plans
        action_result = await db.execute(
            select(ActionPlan).where(ActionPlan.department_name == dept['name'])
        )
        action_plans = action_result.scalars().all()
        
        # Calculate statistics
        total_directives = len(directives)
        pending_directives = sum(1 for d in directives if d.status == 'pending')
        completed_directives = sum(1 for d in directives if d.status == 'completed')
        
        total_actions = len(action_plans)
        pending_actions = sum(1 for a in action_plans if a.status == ActionStatus.PENDING)
        in_progress_actions = sum(1 for a in action_plans if a.status == ActionStatus.IN_PROGRESS)
        completed_actions = sum(1 for a in action_plans if a.status == ActionStatus.COMPLETED)
        overdue_actions = sum(1 for a in action_plans if a.deadline < datetime.utcnow() and a.status != ActionStatus.COMPLETED)
        
        # Calculate average progress
        avg_progress = 0
        if action_plans:
            avg_progress = sum(a.progress_percentage for a in action_plans) / len(action_plans)
        
        # Calculate compliance rate
        compliance_rate = 0
        if total_actions > 0:
            compliance_rate = (completed_actions / total_actions) * 100
        
        return {
            **dept,
            'statistics': {
                'directives': {
                    'total': total_directives,
                    'pending': pending_directives,
                    'completed': completed_directives
                },
                'action_plans': {
                    'total': total_actions,
                    'pending': pending_actions,
                    'in_progress': in_progress_actions,
                    'completed': completed_actions,
                    'overdue': overdue_actions
                },
                'performance': {
                    'average_progress': round(avg_progress, 2),
                    'compliance_rate': round(compliance_rate, 2)
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting department details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{department_id}/actions")
async def get_department_actions(
    department_id: str,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all action plans for a department
    """
    try:
        # Find department
        dept = next((d for d in DEPARTMENTS if d['id'] == department_id), None)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Get action plans
        query = select(ActionPlan).where(ActionPlan.department_name == dept['name'])
        
        if status:
            query = query.where(ActionPlan.status == status)
        
        query = query.order_by(ActionPlan.deadline.asc())
        
        result = await db.execute(query)
        action_plans = result.scalars().all()
        
        return {
            'department_id': department_id,
            'department_name': dept['name'],
            'total': len(action_plans),
            'items': action_plans
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting department actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{department_id}/performance")
async def get_department_performance(
    department_id: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """
    Get performance metrics for a department
    """
    try:
        # Find department
        dept = next((d for d in DEPARTMENTS if d['id'] == department_id), None)
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Get action plans from last N days
        start_date = datetime.utcnow() - timedelta(days=days)
        
        action_result = await db.execute(
            select(ActionPlan).where(
                and_(
                    ActionPlan.department_name == dept['name'],
                    ActionPlan.created_at >= start_date
                )
            )
        )
        action_plans = action_result.scalars().all()
        
        # Calculate metrics
        total_actions = len(action_plans)
        completed_actions = sum(1 for a in action_plans if a.status == ActionStatus.COMPLETED)
        overdue_actions = sum(1 for a in action_plans if a.deadline < datetime.utcnow() and a.status != ActionStatus.COMPLETED)
        
        # Calculate average completion time
        avg_completion_time = 0
        completed_with_dates = [a for a in action_plans if a.status == ActionStatus.COMPLETED and a.actual_completion_date]
        if completed_with_dates:
            completion_times = [(a.actual_completion_date - a.created_at).days for a in completed_with_dates]
            avg_completion_time = sum(completion_times) / len(completion_times)
        
        # Calculate on-time completion rate
        on_time_completions = sum(1 for a in completed_with_dates if a.actual_completion_date <= a.deadline)
        on_time_rate = 0
        if completed_actions > 0:
            on_time_rate = (on_time_completions / completed_actions) * 100
        
        # Calculate average progress
        avg_progress = 0
        if action_plans:
            avg_progress = sum(a.progress_percentage for a in action_plans) / len(action_plans)
        
        # Get priority distribution
        priority_dist = {
            'high': sum(1 for a in action_plans if a.priority == 'high'),
            'medium': sum(1 for a in action_plans if a.priority == 'medium'),
            'low': sum(1 for a in action_plans if a.priority == 'low')
        }
        
        return {
            'department_id': department_id,
            'department_name': dept['name'],
            'period_days': days,
            'metrics': {
                'total_actions': total_actions,
                'completed_actions': completed_actions,
                'overdue_actions': overdue_actions,
                'average_completion_time_days': round(avg_completion_time, 2),
                'on_time_completion_rate': round(on_time_rate, 2),
                'average_progress': round(avg_progress, 2),
                'completion_rate': round((completed_actions / total_actions * 100), 2) if total_actions > 0 else 0
            },
            'priority_distribution': priority_dist
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting department performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/comparison")
async def compare_department_performance(
    db: AsyncSession = Depends(get_db)
):
    """
    Compare performance across all departments
    """
    try:
        comparison = []
        
        for dept in DEPARTMENTS:
            # Get action plans
            action_result = await db.execute(
                select(ActionPlan).where(ActionPlan.department_name == dept['name'])
            )
            action_plans = action_result.scalars().all()
            
            total = len(action_plans)
            completed = sum(1 for a in action_plans if a.status == ActionStatus.COMPLETED)
            overdue = sum(1 for a in action_plans if a.deadline < datetime.utcnow() and a.status != ActionStatus.COMPLETED)
            
            completion_rate = (completed / total * 100) if total > 0 else 0
            avg_progress = sum(a.progress_percentage for a in action_plans) / total if total > 0 else 0
            
            comparison.append({
                'department_id': dept['id'],
                'department_name': dept['name'],
                'total_actions': total,
                'completed_actions': completed,
                'overdue_actions': overdue,
                'completion_rate': round(completion_rate, 2),
                'average_progress': round(avg_progress, 2)
            })
        
        # Sort by completion rate
        comparison.sort(key=lambda x: x['completion_rate'], reverse=True)
        
        return {
            'total_departments': len(comparison),
            'comparison': comparison
        }
        
    except Exception as e:
        logger.error(f"Error comparing department performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
