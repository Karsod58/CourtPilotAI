"""
Search API endpoints
Full-text and semantic search across judgments and directives
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from typing import List, Optional
from loguru import logger

from app.core.database import get_db
from app.models.judgment import Judgment
from app.models.directive import Directive
from app.models.action_plan import ActionPlan

router = APIRouter()


@router.get("/")
async def search_all(
    q: str = Query(..., min_length=2),
    search_type: str = Query("all", regex="^(all|judgments|directives|actions)$"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Global search across all entities
    """
    try:
        results = {
            'query': q,
            'judgments': [],
            'directives': [],
            'action_plans': []
        }
        
        search_term = f"%{q}%"
        
        # Search judgments
        if search_type in ['all', 'judgments']:
            judgment_query = select(Judgment).where(
                or_(
                    Judgment.case_id.ilike(search_term),
                    Judgment.court_name.ilike(search_term),
                    Judgment.petitioner.ilike(search_term),
                    Judgment.respondent.ilike(search_term),
                    Judgment.judge_name.ilike(search_term)
                )
            ).limit(limit)
            
            judgment_result = await db.execute(judgment_query)
            judgments = judgment_result.scalars().all()
            
            results['judgments'] = [{
                'id': j.id,
                'case_id': j.case_id,
                'court_name': j.court_name,
                'petitioner': j.petitioner,
                'respondent': j.respondent,
                'judgment_date': j.judgment_date.isoformat() if j.judgment_date else None,
                'status': j.status,
                'type': 'judgment'
            } for j in judgments]
        
        # Search directives
        if search_type in ['all', 'directives']:
            directive_query = select(Directive).where(
                or_(
                    Directive.directive_text.ilike(search_term),
                    Directive.action_required.ilike(search_term),
                    Directive.responsible_entity.ilike(search_term),
                    Directive.assigned_department.ilike(search_term)
                )
            ).limit(limit)
            
            directive_result = await db.execute(directive_query)
            directives = directive_result.scalars().all()
            
            results['directives'] = [{
                'id': d.id,
                'judgment_id': d.judgment_id,
                'directive_text': d.directive_text[:200] + '...' if len(d.directive_text) > 200 else d.directive_text,
                'directive_type': d.directive_type,
                'priority': d.priority,
                'status': d.status,
                'department': d.assigned_department or d.responsible_entity,
                'type': 'directive'
            } for d in directives]
        
        # Search action plans
        if search_type in ['all', 'actions']:
            action_query = select(ActionPlan).where(
                or_(
                    ActionPlan.title.ilike(search_term),
                    ActionPlan.description.ilike(search_term),
                    ActionPlan.department_name.ilike(search_term)
                )
            ).limit(limit)
            
            action_result = await db.execute(action_query)
            action_plans = action_result.scalars().all()
            
            results['action_plans'] = [{
                'id': a.id,
                'judgment_id': a.judgment_id,
                'title': a.title,
                'description': a.description[:200] + '...' if a.description and len(a.description) > 200 else a.description,
                'department': a.department_name,
                'status': a.status.value,
                'priority': a.priority,
                'type': 'action_plan'
            } for a in action_plans]
        
        # Calculate total results
        total = len(results['judgments']) + len(results['directives']) + len(results['action_plans'])
        
        return {
            'total': total,
            'query': q,
            'results': results
        }
        
    except Exception as e:
        logger.error(f"Error in global search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/judgments")
async def search_judgments(
    q: str = Query(..., min_length=2),
    status: Optional[str] = None,
    court: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced search for judgments
    """
    try:
        search_term = f"%{q}%"
        
        query = select(Judgment).where(
            or_(
                Judgment.case_id.ilike(search_term),
                Judgment.court_name.ilike(search_term),
                Judgment.petitioner.ilike(search_term),
                Judgment.respondent.ilike(search_term),
                Judgment.judge_name.ilike(search_term),
                Judgment.case_type.ilike(search_term)
            )
        )
        
        # Apply filters
        if status:
            query = query.where(Judgment.status == status)
        if court:
            query = query.where(Judgment.court_name.ilike(f"%{court}%"))
        if date_from:
            query = query.where(Judgment.judgment_date >= date_from)
        if date_to:
            query = query.where(Judgment.judgment_date <= date_to)
        
        query = query.limit(limit).order_by(Judgment.uploaded_at.desc())
        
        result = await db.execute(query)
        judgments = result.scalars().all()
        
        return {
            'total': len(judgments),
            'query': q,
            'filters': {
                'status': status,
                'court': court,
                'date_from': date_from,
                'date_to': date_to
            },
            'items': judgments
        }
        
    except Exception as e:
        logger.error(f"Error searching judgments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/directives")
async def search_directives(
    q: str = Query(..., min_length=2),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced search for directives
    """
    try:
        search_term = f"%{q}%"
        
        query = select(Directive).where(
            or_(
                Directive.directive_text.ilike(search_term),
                Directive.action_required.ilike(search_term),
                Directive.responsible_entity.ilike(search_term)
            )
        )
        
        # Apply filters
        if status:
            query = query.where(Directive.compliance_status == status)
        if priority:
            query = query.where(Directive.priority == priority)
        if department:
            query = query.where(
                or_(
                    Directive.assigned_department.ilike(f"%{department}%"),
                    Directive.responsible_entity.ilike(f"%{department}%")
                )
            )
        
        query = query.limit(limit)
        
        result = await db.execute(query)
        directives = result.scalars().all()
        
        return {
            'total': len(directives),
            'query': q,
            'filters': {
                'status': status,
                'priority': priority,
                'department': department
            },
            'items': directives
        }
        
    except Exception as e:
        logger.error(f"Error searching directives: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/actions")
async def search_action_plans(
    q: str = Query(..., min_length=2),
    status: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced search for action plans
    """
    try:
        search_term = f"%{q}%"
        
        query = select(ActionPlan).where(
            or_(
                ActionPlan.title.ilike(search_term),
                ActionPlan.description.ilike(search_term),
                ActionPlan.department_name.ilike(search_term)
            )
        )
        
        # Apply filters
        if status:
            query = query.where(ActionPlan.status == status)
        if department:
            query = query.where(ActionPlan.department_name.ilike(f"%{department}%"))
        if priority:
            query = query.where(ActionPlan.priority == priority)
        
        query = query.limit(limit).order_by(ActionPlan.created_at.desc())
        
        result = await db.execute(query)
        action_plans = result.scalars().all()
        
        return {
            'total': len(action_plans),
            'query': q,
            'filters': {
                'status': status,
                'department': department,
                'priority': priority
            },
            'items': action_plans
        }
        
    except Exception as e:
        logger.error(f"Error searching action plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/similar/{judgment_id}")
async def find_similar_judgments(
    judgment_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Find similar judgments based on court, case type, and parties
    """
    try:
        # Get the reference judgment
        ref_result = await db.execute(
            select(Judgment).where(Judgment.id == judgment_id)
        )
        ref_judgment = ref_result.scalar_one_or_none()
        
        if not ref_judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Find similar judgments
        query = select(Judgment).where(
            and_(
                Judgment.id != judgment_id,
                or_(
                    Judgment.court_name == ref_judgment.court_name,
                    Judgment.case_type == ref_judgment.case_type,
                    Judgment.petitioner.ilike(f"%{ref_judgment.petitioner}%") if ref_judgment.petitioner else False,
                    Judgment.respondent.ilike(f"%{ref_judgment.respondent}%") if ref_judgment.respondent else False
                )
            )
        ).limit(limit).order_by(Judgment.judgment_date.desc())
        
        result = await db.execute(query)
        similar_judgments = result.scalars().all()
        
        return {
            'reference_judgment_id': judgment_id,
            'total': len(similar_judgments),
            'items': similar_judgments
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding similar judgments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_searches(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recently added/updated items
    """
    try:
        # Get recent judgments
        judgment_query = select(Judgment).order_by(
            Judgment.uploaded_at.desc()
        ).limit(limit)
        judgment_result = await db.execute(judgment_query)
        recent_judgments = judgment_result.scalars().all()
        
        # Get recent directives
        directive_query = select(Directive).order_by(
            Directive.created_at.desc()
        ).limit(limit)
        directive_result = await db.execute(directive_query)
        recent_directives = directive_result.scalars().all()
        
        # Get recent action plans
        action_query = select(ActionPlan).order_by(
            ActionPlan.created_at.desc()
        ).limit(limit)
        action_result = await db.execute(action_query)
        recent_actions = action_result.scalars().all()
        
        return {
            'judgments': recent_judgments[:5],
            'directives': recent_directives[:5],
            'action_plans': recent_actions[:5]
        }
        
    except Exception as e:
        logger.error(f"Error getting recent items: {e}")
        raise HTTPException(status_code=500, detail=str(e))
