"""
Alerts and Escalation API endpoints
Manage alerts for overdue items and escalations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from loguru import logger

from app.core.database import get_db
from app.models.directive import Directive
from app.models.action_plan import ActionPlan, ActionStatus
from app.models.judgment import Judgment

router = APIRouter()


@router.get("/")
async def get_all_alerts(
    severity: Optional[str] = Query(None, regex="^(critical|high|medium|low)$"),
    status: Optional[str] = Query(None, regex="^(active|acknowledged|resolved)$"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all system alerts
    """
    try:
        alerts = []
        
        # Get overdue directives (critical alerts)
        directive_result = await db.execute(
            select(Directive).where(
                and_(
                    Directive.deadline.isnot(None),
                    Directive.deadline < datetime.utcnow(),
                    Directive.compliance_status != 'completed'
                )
            )
        )
        overdue_directives = directive_result.scalars().all()
        
        for directive in overdue_directives:
            days_overdue = (datetime.utcnow() - directive.deadline).days
            severity_level = 'critical' if days_overdue > 7 else 'high'
            
            if not severity or severity == severity_level:
                alerts.append({
                    'id': f"directive_{directive.id}",
                    'type': 'overdue_directive',
                    'severity': severity_level,
                    'status': 'active',
                    'title': 'Overdue Directive',
                    'message': f'Directive is {days_overdue} days overdue',
                    'entity_id': directive.id,
                    'entity_type': 'directive',
                    'judgment_id': directive.judgment_id,
                    'department': directive.assigned_department or directive.responsible_entity,
                    'deadline': directive.deadline.isoformat(),
                    'days_overdue': days_overdue,
                    'created_at': directive.deadline.isoformat()
                })
        
        # Get overdue action plans (high alerts)
        action_result = await db.execute(
            select(ActionPlan).where(
                and_(
                    ActionPlan.deadline < datetime.utcnow(),
                    ActionPlan.status != ActionStatus.COMPLETED
                )
            )
        )
        overdue_actions = action_result.scalars().all()
        
        for action in overdue_actions:
            days_overdue = (datetime.utcnow() - action.deadline).days
            severity_level = 'critical' if days_overdue > 7 else 'high'
            
            if not severity or severity == severity_level:
                alerts.append({
                    'id': f"action_{action.id}",
                    'type': 'overdue_action_plan',
                    'severity': severity_level,
                    'status': 'active',
                    'title': 'Overdue Action Plan',
                    'message': f'Action plan "{action.title}" is {days_overdue} days overdue',
                    'entity_id': action.id,
                    'entity_type': 'action_plan',
                    'judgment_id': action.judgment_id,
                    'department': action.department_name,
                    'deadline': action.deadline.isoformat(),
                    'days_overdue': days_overdue,
                    'progress': action.progress_percentage,
                    'created_at': action.deadline.isoformat()
                })
        
        # Get low confidence directives (medium alerts)
        low_confidence_result = await db.execute(
            select(Directive).where(
                and_(
                    Directive.confidence_score < 0.5,
                    Directive.verification_status == 'pending'
                )
            )
        )
        low_confidence_directives = low_confidence_result.scalars().all()
        
        for directive in low_confidence_directives:
            if not severity or severity == 'medium':
                alerts.append({
                    'id': f"low_conf_{directive.id}",
                    'type': 'low_confidence',
                    'severity': 'medium',
                    'status': 'active',
                    'title': 'Low Confidence Extraction',
                    'message': f'Directive has low confidence score ({round(directive.confidence_score * 100)}%)',
                    'entity_id': directive.id,
                    'entity_type': 'directive',
                    'judgment_id': directive.judgment_id,
                    'confidence_score': directive.confidence_score,
                    'created_at': directive.created_at.isoformat() if directive.created_at else None
                })
        
        # Get stuck in processing (high alerts)
        stuck_result = await db.execute(
            select(Judgment).where(
                and_(
                    Judgment.status == 'processing',
                    Judgment.uploaded_at < datetime.utcnow() - timedelta(hours=1)
                )
            )
        )
        stuck_judgments = stuck_result.scalars().all()
        
        for judgment in stuck_judgments:
            if not severity or severity == 'high':
                alerts.append({
                    'id': f"stuck_{judgment.id}",
                    'type': 'stuck_processing',
                    'severity': 'high',
                    'status': 'active',
                    'title': 'Processing Stuck',
                    'message': f'Judgment {judgment.case_id} stuck in processing',
                    'entity_id': judgment.id,
                    'entity_type': 'judgment',
                    'judgment_id': judgment.id,
                    'created_at': judgment.uploaded_at.isoformat() if judgment.uploaded_at else None
                })
        
        # Sort by severity and date
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        alerts.sort(key=lambda x: (severity_order.get(x['severity'], 4), x.get('created_at', '')), reverse=True)
        
        # Apply limit
        alerts = alerts[:limit]
        
        # Calculate statistics
        total = len(alerts)
        by_severity = {
            'critical': sum(1 for a in alerts if a['severity'] == 'critical'),
            'high': sum(1 for a in alerts if a['severity'] == 'high'),
            'medium': sum(1 for a in alerts if a['severity'] == 'medium'),
            'low': sum(1 for a in alerts if a['severity'] == 'low')
        }
        
        return {
            'total': total,
            'by_severity': by_severity,
            'items': alerts
        }
        
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active")
async def get_active_alerts(
    db: AsyncSession = Depends(get_db)
):
    """
    Get only active (unacknowledged) alerts
    """
    try:
        # Reuse the main alerts endpoint with active filter
        return await get_all_alerts(status='active', db=db)
        
    except Exception as e:
        logger.error(f"Error getting active alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/critical")
async def get_critical_alerts(
    db: AsyncSession = Depends(get_db)
):
    """
    Get only critical severity alerts
    """
    try:
        return await get_all_alerts(severity='critical', db=db)
        
    except Exception as e:
        logger.error(f"Error getting critical alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/escalated")
async def get_escalated_items(
    db: AsyncSession = Depends(get_db)
):
    """
    Get items that need escalation (severely overdue)
    """
    try:
        escalated = []
        
        # Get severely overdue directives (>14 days)
        directive_result = await db.execute(
            select(Directive).where(
                and_(
                    Directive.deadline.isnot(None),
                    Directive.deadline < datetime.utcnow() - timedelta(days=14),
                    Directive.compliance_status != 'completed'
                )
            )
        )
        overdue_directives = directive_result.scalars().all()
        
        for directive in overdue_directives:
            days_overdue = (datetime.utcnow() - directive.deadline).days
            escalated.append({
                'id': directive.id,
                'type': 'directive',
                'title': directive.directive_text[:100] + '...',
                'judgment_id': directive.judgment_id,
                'department': directive.assigned_department or directive.responsible_entity,
                'deadline': directive.deadline.isoformat(),
                'days_overdue': days_overdue,
                'priority': directive.priority,
                'requires_escalation': True,
                'escalation_reason': f'{days_overdue} days overdue - requires immediate attention'
            })
        
        # Get severely overdue action plans (>14 days)
        action_result = await db.execute(
            select(ActionPlan).where(
                and_(
                    ActionPlan.deadline < datetime.utcnow() - timedelta(days=14),
                    ActionPlan.status != ActionStatus.COMPLETED
                )
            )
        )
        overdue_actions = action_result.scalars().all()
        
        for action in overdue_actions:
            days_overdue = (datetime.utcnow() - action.deadline).days
            escalated.append({
                'id': action.id,
                'type': 'action_plan',
                'title': action.title,
                'judgment_id': action.judgment_id,
                'department': action.department_name,
                'deadline': action.deadline.isoformat(),
                'days_overdue': days_overdue,
                'priority': action.priority,
                'progress': action.progress_percentage,
                'requires_escalation': True,
                'escalation_reason': f'{days_overdue} days overdue with {action.progress_percentage}% progress'
            })
        
        # Sort by days overdue (most overdue first)
        escalated.sort(key=lambda x: x['days_overdue'], reverse=True)
        
        return {
            'total': len(escalated),
            'items': escalated
        }
        
    except Exception as e:
        logger.error(f"Error getting escalated items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/department/{department_name}")
async def get_department_alerts(
    department_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get alerts for a specific department
    """
    try:
        alerts = []
        
        # Get overdue directives for department
        directive_result = await db.execute(
            select(Directive).where(
                and_(
                    Directive.deadline.isnot(None),
                    Directive.deadline < datetime.utcnow(),
                    Directive.compliance_status != 'completed',
                    or_(
                        Directive.assigned_department == department_name,
                        Directive.responsible_entity == department_name
                    )
                )
            )
        )
        overdue_directives = directive_result.scalars().all()
        
        for directive in overdue_directives:
            days_overdue = (datetime.utcnow() - directive.deadline).days
            alerts.append({
                'id': f"directive_{directive.id}",
                'type': 'overdue_directive',
                'severity': 'critical' if days_overdue > 7 else 'high',
                'title': 'Overdue Directive',
                'message': f'Directive is {days_overdue} days overdue',
                'entity_id': directive.id,
                'judgment_id': directive.judgment_id,
                'days_overdue': days_overdue
            })
        
        # Get overdue action plans for department
        action_result = await db.execute(
            select(ActionPlan).where(
                and_(
                    ActionPlan.deadline < datetime.utcnow(),
                    ActionPlan.status != ActionStatus.COMPLETED,
                    ActionPlan.department_name == department_name
                )
            )
        )
        overdue_actions = action_result.scalars().all()
        
        for action in overdue_actions:
            days_overdue = (datetime.utcnow() - action.deadline).days
            alerts.append({
                'id': f"action_{action.id}",
                'type': 'overdue_action_plan',
                'severity': 'critical' if days_overdue > 7 else 'high',
                'title': 'Overdue Action Plan',
                'message': f'Action plan "{action.title}" is {days_overdue} days overdue',
                'entity_id': action.id,
                'judgment_id': action.judgment_id,
                'days_overdue': days_overdue,
                'progress': action.progress_percentage
            })
        
        return {
            'department': department_name,
            'total': len(alerts),
            'items': alerts
        }
        
    except Exception as e:
        logger.error(f"Error getting department alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_alert_statistics(
    db: AsyncSession = Depends(get_db)
):
    """
    Get alert statistics
    """
    try:
        # Count overdue directives
        directive_result = await db.execute(
            select(Directive).where(
                and_(
                    Directive.deadline.isnot(None),
                    Directive.deadline < datetime.utcnow(),
                    Directive.compliance_status != 'completed'
                )
            )
        )
        overdue_directives = directive_result.scalars().all()
        
        # Count overdue action plans
        action_result = await db.execute(
            select(ActionPlan).where(
                and_(
                    ActionPlan.deadline < datetime.utcnow(),
                    ActionPlan.status != ActionStatus.COMPLETED
                )
            )
        )
        overdue_actions = action_result.scalars().all()
        
        # Count low confidence directives
        low_confidence_result = await db.execute(
            select(Directive).where(
                and_(
                    Directive.confidence_score < 0.7,
                    Directive.verification_status == 'pending'
                )
            )
        )
        low_confidence_directives = low_confidence_result.scalars().all()
        
        # Calculate severity counts
        critical_count = sum(1 for d in overdue_directives if (datetime.utcnow() - d.deadline).days > 7)
        critical_count += sum(1 for a in overdue_actions if (datetime.utcnow() - a.deadline).days > 7)
        
        high_count = sum(1 for d in overdue_directives if (datetime.utcnow() - d.deadline).days <= 7)
        high_count += sum(1 for a in overdue_actions if (datetime.utcnow() - a.deadline).days <= 7)
        
        medium_count = len(low_confidence_directives)
        
        total_alerts = critical_count + high_count + medium_count
        
        return {
            'total_alerts': total_alerts,
            'critical_alerts': critical_count,
            'high_alerts': high_count,
            'medium_alerts': medium_count,
            'low_alerts': 0,
            'escalated_items': critical_count,
            'by_severity': {
                'critical': critical_count,
                'high': high_count,
                'medium': medium_count,
                'low': 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting alert statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
