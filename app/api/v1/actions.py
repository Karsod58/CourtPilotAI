"""
Action Plans API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
from loguru import logger
import uuid

from app.core.database import get_db
from app.models.action_plan import ActionPlan, ActionStatus
from app.models.directive import Directive
from app.models.judgment import Judgment

router = APIRouter()


@router.get("/")
async def get_action_plans(
    status: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
    overdue_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all action plans with optional filters
    """
    try:
        query = select(ActionPlan)
        
        # Apply filters
        filters = []
        if status:
            filters.append(ActionPlan.status == status)
        if department:
            filters.append(ActionPlan.department_name == department)
        if priority:
            filters.append(ActionPlan.priority == priority)
        if overdue_only:
            filters.append(and_(
                ActionPlan.deadline < datetime.utcnow(),
                ActionPlan.status != ActionStatus.COMPLETED
            ))
        
        if filters:
            query = query.where(and_(*filters))
        
        # Get total count
        count_query = select(func.count()).select_from(ActionPlan)
        if filters:
            count_query = count_query.where(and_(*filters))
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        query = query.order_by(ActionPlan.deadline.asc())
        
        result = await db.execute(query)
        action_plans = result.scalars().all()
        
        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'items': action_plans
        }
        
    except Exception as e:
        logger.error(f"Error getting action plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{action_plan_id}")
async def get_action_plan(
    action_plan_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get action plan details by ID
    """
    try:
        result = await db.execute(
            select(ActionPlan).where(ActionPlan.id == action_plan_id)
        )
        action_plan = result.scalar_one_or_none()
        
        if not action_plan:
            raise HTTPException(status_code=404, detail="Action plan not found")
        
        return action_plan
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting action plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_action_plan(
    judgment_id: str,
    department_name: str,
    title: str,
    description: Optional[str] = None,
    deadline: Optional[str] = None,
    priority: str = "medium",
    directive_ids: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new action plan
    """
    try:
        # Verify judgment exists
        judgment_result = await db.execute(
            select(Judgment).where(Judgment.id == judgment_id)
        )
        judgment = judgment_result.scalar_one_or_none()
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Parse deadline
        deadline_dt = None
        if deadline:
            try:
                deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            except:
                # Default to 30 days from now
                deadline_dt = datetime.utcnow() + timedelta(days=30)
        else:
            deadline_dt = datetime.utcnow() + timedelta(days=30)
        
        # Create action plan
        action_plan = ActionPlan(
            id=str(uuid.uuid4()),
            judgment_id=judgment_id,
            title=title,
            description=description,
            department_name=department_name,
            department_id=department_name.lower().replace(' ', '_'),
            deadline=deadline_dt,
            priority=priority,
            status=ActionStatus.PENDING,
            progress_percentage=0,
            directive_ids=directive_ids or [],
            action_items=[],
            compliance_checklist=[],
            audit_log=[]
        )
        
        db.add(action_plan)
        await db.commit()
        await db.refresh(action_plan)
        
        logger.info(f"Created action plan {action_plan.id} for judgment {judgment_id}")
        return action_plan
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating action plan: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{action_plan_id}/status")
async def update_action_plan_status(
    action_plan_id: str,
    status: str,
    notes: Optional[str] = None,
    updated_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Update action plan status
    """
    try:
        result = await db.execute(
            select(ActionPlan).where(ActionPlan.id == action_plan_id)
        )
        action_plan = result.scalar_one_or_none()
        
        if not action_plan:
            raise HTTPException(status_code=404, detail="Action plan not found")
        
        # Update status
        old_status = action_plan.status
        action_plan.status = ActionStatus(status)
        
        # If completed, set completion date
        if status == ActionStatus.COMPLETED.value:
            action_plan.actual_completion_date = datetime.utcnow()
            action_plan.progress_percentage = 100
        
        # Update audit log
        if not action_plan.audit_log:
            action_plan.audit_log = []
        
        action_plan.audit_log.append({
            'timestamp': datetime.utcnow().isoformat(),
            'action': 'status_change',
            'old_status': old_status,
            'new_status': status,
            'updated_by': updated_by or 'system',
            'notes': notes
        })
        
        action_plan.last_update_by = updated_by or 'system'
        action_plan.last_update_notes = notes
        
        await db.commit()
        await db.refresh(action_plan)
        
        logger.info(f"Updated action plan {action_plan_id} status to {status}")
        return action_plan
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating action plan status: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{action_plan_id}/progress")
async def update_action_plan_progress(
    action_plan_id: str,
    progress_percentage: int,
    notes: Optional[str] = None,
    updated_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Update action plan progress
    """
    try:
        if progress_percentage < 0 or progress_percentage > 100:
            raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
        
        result = await db.execute(
            select(ActionPlan).where(ActionPlan.id == action_plan_id)
        )
        action_plan = result.scalar_one_or_none()
        
        if not action_plan:
            raise HTTPException(status_code=404, detail="Action plan not found")
        
        # Update progress
        old_progress = action_plan.progress_percentage
        action_plan.progress_percentage = progress_percentage
        
        # Update status based on progress
        if progress_percentage == 0:
            action_plan.status = ActionStatus.PENDING
        elif progress_percentage == 100:
            action_plan.status = ActionStatus.COMPLETED
            action_plan.actual_completion_date = datetime.utcnow()
        else:
            action_plan.status = ActionStatus.IN_PROGRESS
        
        # Update audit log
        if not action_plan.audit_log:
            action_plan.audit_log = []
        
        action_plan.audit_log.append({
            'timestamp': datetime.utcnow().isoformat(),
            'action': 'progress_update',
            'old_progress': old_progress,
            'new_progress': progress_percentage,
            'updated_by': updated_by or 'system',
            'notes': notes
        })
        
        action_plan.last_update_by = updated_by or 'system'
        action_plan.last_update_notes = notes
        
        await db.commit()
        await db.refresh(action_plan)
        
        logger.info(f"Updated action plan {action_plan_id} progress to {progress_percentage}%")
        return action_plan
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating action plan progress: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/department/{department_name}")
async def get_department_action_plans(
    department_name: str,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get action plans for a specific department
    """
    try:
        query = select(ActionPlan).where(ActionPlan.department_name == department_name)
        
        if status:
            query = query.where(ActionPlan.status == status)
        
        query = query.order_by(ActionPlan.deadline.asc())
        
        result = await db.execute(query)
        action_plans = result.scalars().all()
        
        return {
            'department': department_name,
            'total': len(action_plans),
            'items': action_plans
        }
        
    except Exception as e:
        logger.error(f"Error getting department action plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue/list")
async def get_overdue_action_plans(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all overdue action plans
    """
    try:
        query = select(ActionPlan).where(
            and_(
                ActionPlan.deadline < datetime.utcnow(),
                ActionPlan.status != ActionStatus.COMPLETED
            )
        ).order_by(ActionPlan.deadline.asc())
        
        result = await db.execute(query)
        action_plans = result.scalars().all()
        
        return {
            'total': len(action_plans),
            'items': action_plans
        }
        
    except Exception as e:
        logger.error(f"Error getting overdue action plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{action_plan_id}")
async def delete_action_plan(
    action_plan_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an action plan
    """
    try:
        result = await db.execute(
            select(ActionPlan).where(ActionPlan.id == action_plan_id)
        )
        action_plan = result.scalar_one_or_none()
        
        if not action_plan:
            raise HTTPException(status_code=404, detail="Action plan not found")
        
        await db.delete(action_plan)
        await db.commit()
        
        logger.info(f"Deleted action plan {action_plan_id}")
        return {"message": "Action plan deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting action plan: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/judgment/{judgment_id}/actions")
async def get_judgment_action_plans(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all action plans for a specific judgment
    """
    try:
        query = select(ActionPlan).where(
            ActionPlan.judgment_id == judgment_id
        ).order_by(ActionPlan.created_at.desc())
        
        result = await db.execute(query)
        action_plans = result.scalars().all()
        
        return {
            'judgment_id': judgment_id,
            'total': len(action_plans),
            'items': action_plans
        }
        
    except Exception as e:
        logger.error(f"Error getting judgment action plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))
