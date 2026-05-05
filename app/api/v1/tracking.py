"""
Lifecycle Tracking API endpoints
Track case lifecycle stages and status updates
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from loguru import logger

from app.core.database import get_db
from app.models.judgment import Judgment
from app.models.directive import Directive
from app.models.action_plan import ActionPlan

router = APIRouter()


@router.get("/lifecycle/{judgment_id}")
async def get_lifecycle_status(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete lifecycle status for a judgment
    """
    try:
        # Get judgment
        judgment_result = await db.execute(
            select(Judgment).where(Judgment.id == judgment_id)
        )
        judgment = judgment_result.scalar_one_or_none()
        
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Get directives
        directive_result = await db.execute(
            select(Directive).where(Directive.judgment_id == judgment_id)
        )
        directives = directive_result.scalars().all()
        
        # Get action plans
        action_result = await db.execute(
            select(ActionPlan).where(ActionPlan.judgment_id == judgment_id)
        )
        action_plans = action_result.scalars().all()
        
        # Calculate lifecycle stages
        stages = {
            'uploaded': {
                'status': 'completed',
                'date': judgment.uploaded_at.isoformat() if judgment.uploaded_at else None,
                'description': 'Judgment uploaded to system'
            },
            'processing': {
                'status': 'completed' if judgment.status in ['completed', 'pending_verification'] else 'in_progress' if judgment.status == 'processing' else 'pending',
                'date': judgment.processed_at.isoformat() if judgment.processed_at else None,
                'description': 'AI extraction and analysis'
            },
            'verification': {
                'status': 'completed' if len([d for d in directives if d.verification_status in ['approved', 'edited']]) == len(directives) and len(directives) > 0 else 'in_progress' if len([d for d in directives if d.verification_status == 'pending']) > 0 else 'pending',
                'date': None,
                'description': 'Human verification of directives',
                'pending_count': len([d for d in directives if d.verification_status == 'pending']),
                'verified_count': len([d for d in directives if d.verification_status in ['approved', 'edited']])
            },
            'action_planning': {
                'status': 'completed' if len(action_plans) > 0 else 'pending',
                'date': action_plans[0].created_at.isoformat() if action_plans else None,
                'description': 'Action plan creation',
                'action_plans_count': len(action_plans)
            },
            'execution': {
                'status': 'completed' if len([a for a in action_plans if a.status.value == 'completed']) == len(action_plans) and len(action_plans) > 0 else 'in_progress' if len([a for a in action_plans if a.status.value == 'in_progress']) > 0 else 'pending',
                'date': None,
                'description': 'Action plan execution',
                'completed_count': len([a for a in action_plans if a.status.value == 'completed']),
                'in_progress_count': len([a for a in action_plans if a.status.value == 'in_progress']),
                'pending_count': len([a for a in action_plans if a.status.value == 'pending'])
            },
            'compliance': {
                'status': 'completed' if len([a for a in action_plans if a.status.value == 'completed']) == len(action_plans) and len(action_plans) > 0 else 'pending',
                'date': None,
                'description': 'Compliance verification'
            }
        }
        
        # Calculate overall progress
        completed_stages = sum(1 for stage in stages.values() if stage['status'] == 'completed')
        total_stages = len(stages)
        progress_percentage = round((completed_stages / total_stages) * 100)
        
        return {
            'judgment_id': judgment_id,
            'case_id': judgment.case_id,
            'current_stage': get_current_stage(stages),
            'progress_percentage': progress_percentage,
            'stages': stages,
            'summary': {
                'total_directives': len(directives),
                'verified_directives': len([d for d in directives if d.verification_status in ['approved', 'edited']]),
                'total_action_plans': len(action_plans),
                'completed_action_plans': len([a for a in action_plans if a.status.value == 'completed'])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lifecycle status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_current_stage(stages: dict) -> str:
    """Determine the current active stage"""
    stage_order = ['uploaded', 'processing', 'verification', 'action_planning', 'execution', 'compliance']
    
    for stage_name in stage_order:
        if stages[stage_name]['status'] == 'in_progress':
            return stage_name
        elif stages[stage_name]['status'] == 'pending':
            return stage_name
    
    return 'compliance'  # All completed


@router.get("/timeline/{judgment_id}")
async def get_timeline(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed timeline of events for a judgment
    """
    try:
        # Get judgment
        judgment_result = await db.execute(
            select(Judgment).where(Judgment.id == judgment_id)
        )
        judgment = judgment_result.scalar_one_or_none()
        
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Get directives
        directive_result = await db.execute(
            select(Directive).where(Directive.judgment_id == judgment_id)
        )
        directives = directive_result.scalars().all()
        
        # Get action plans
        action_result = await db.execute(
            select(ActionPlan).where(ActionPlan.judgment_id == judgment_id)
        )
        action_plans = action_result.scalars().all()
        
        # Build timeline
        timeline = []
        
        # Upload event
        if judgment.uploaded_at:
            timeline.append({
                'timestamp': judgment.uploaded_at.isoformat(),
                'event_type': 'upload',
                'title': 'Judgment Uploaded',
                'description': f'Case {judgment.case_id} uploaded to system',
                'status': 'completed'
            })
        
        # Processing event
        if judgment.processed_at:
            timeline.append({
                'timestamp': judgment.processed_at.isoformat(),
                'event_type': 'processing',
                'title': 'AI Processing Complete',
                'description': f'Extracted {len(directives)} directives from {judgment.page_count or 0} pages',
                'status': 'completed'
            })
        
        # Verification events
        for directive in directives:
            if directive.verified_at:
                timeline.append({
                    'timestamp': directive.verified_at.isoformat(),
                    'event_type': 'verification',
                    'title': f'Directive {directive.verification_status.capitalize()}',
                    'description': directive.directive_text[:100] + '...',
                    'status': 'completed',
                    'verified_by': directive.verified_by
                })
        
        # Action plan events
        for action_plan in action_plans:
            timeline.append({
                'timestamp': action_plan.created_at.isoformat(),
                'event_type': 'action_plan',
                'title': 'Action Plan Created',
                'description': action_plan.title,
                'status': 'completed',
                'department': action_plan.department_name
            })
            
            # Add audit log events
            if action_plan.audit_log:
                for log_entry in action_plan.audit_log:
                    timeline.append({
                        'timestamp': log_entry.get('timestamp'),
                        'event_type': 'update',
                        'title': log_entry.get('action', 'Update').replace('_', ' ').title(),
                        'description': log_entry.get('notes', ''),
                        'status': 'completed',
                        'updated_by': log_entry.get('updated_by')
                    })
        
        # Sort timeline by timestamp
        timeline.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return {
            'judgment_id': judgment_id,
            'case_id': judgment.case_id,
            'total_events': len(timeline),
            'timeline': timeline
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/{judgment_id}")
async def get_audit_trail(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete audit trail for a judgment
    """
    try:
        # Get judgment
        judgment_result = await db.execute(
            select(Judgment).where(Judgment.id == judgment_id)
        )
        judgment = judgment_result.scalar_one_or_none()
        
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Get directives
        directive_result = await db.execute(
            select(Directive).where(Directive.judgment_id == judgment_id)
        )
        directives = directive_result.scalars().all()
        
        # Get action plans
        action_result = await db.execute(
            select(ActionPlan).where(ActionPlan.judgment_id == judgment_id)
        )
        action_plans = action_result.scalars().all()
        
        # Build audit trail
        audit_trail = []
        
        # Judgment audit
        audit_trail.append({
            'entity_type': 'judgment',
            'entity_id': judgment.id,
            'action': 'created',
            'timestamp': judgment.uploaded_at.isoformat() if judgment.uploaded_at else None,
            'details': {
                'case_id': judgment.case_id,
                'court': judgment.court_name,
                'status': judgment.status
            }
        })
        
        # Directive audits
        for directive in directives:
            audit_trail.append({
                'entity_type': 'directive',
                'entity_id': directive.id,
                'action': 'extracted',
                'timestamp': directive.created_at.isoformat() if directive.created_at else None,
                'details': {
                    'confidence_score': directive.confidence_score,
                    'priority': directive.priority
                }
            })
            
            if directive.verified_at:
                audit_trail.append({
                    'entity_type': 'directive',
                    'entity_id': directive.id,
                    'action': f'verified_{directive.verification_status}',
                    'timestamp': directive.verified_at.isoformat(),
                    'user': directive.verified_by,
                    'details': {
                        'verification_status': directive.verification_status,
                        'notes': directive.verification_notes
                    }
                })
        
        # Action plan audits
        for action_plan in action_plans:
            audit_trail.append({
                'entity_type': 'action_plan',
                'entity_id': action_plan.id,
                'action': 'created',
                'timestamp': action_plan.created_at.isoformat(),
                'details': {
                    'title': action_plan.title,
                    'department': action_plan.department_name,
                    'priority': action_plan.priority
                }
            })
            
            # Add audit log entries
            if action_plan.audit_log:
                for log_entry in action_plan.audit_log:
                    audit_trail.append({
                        'entity_type': 'action_plan',
                        'entity_id': action_plan.id,
                        'action': log_entry.get('action'),
                        'timestamp': log_entry.get('timestamp'),
                        'user': log_entry.get('updated_by'),
                        'details': log_entry
                    })
        
        # Sort by timestamp
        audit_trail.sort(key=lambda x: x['timestamp'] if x['timestamp'] else '', reverse=True)
        
        return {
            'judgment_id': judgment_id,
            'case_id': judgment.case_id,
            'total_entries': len(audit_trail),
            'audit_trail': audit_trail
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting audit trail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_tracking_statistics(
    db: AsyncSession = Depends(get_db)
):
    """
    Get overall tracking statistics
    """
    try:
        # Get all judgments
        judgment_result = await db.execute(select(Judgment))
        judgments = judgment_result.scalars().all()
        
        # Calculate statistics
        total_judgments = len(judgments)
        uploaded = sum(1 for j in judgments if j.status == 'uploaded')
        processing = sum(1 for j in judgments if j.status == 'processing')
        pending_verification = sum(1 for j in judgments if j.status == 'pending_verification')
        completed = sum(1 for j in judgments if j.status == 'completed')
        
        return {
            'total_judgments': total_judgments,
            'by_status': {
                'uploaded': uploaded,
                'processing': processing,
                'pending_verification': pending_verification,
                'completed': completed
            },
            'completion_rate': round((completed / total_judgments * 100), 2) if total_judgments > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting tracking statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
