"""
Verification API endpoints
Human-in-the-loop verification of AI extractions
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Dict
from loguru import logger

from app.core.database import get_db
from app.models.directive import Directive, VerificationStatus
from app.schemas.directive import (
    DirectiveResponse,
    DirectiveWithHighlight,
    DirectiveVerification,
    DirectiveList
)

router = APIRouter()


@router.get("/pending", response_model=DirectiveList)
async def get_pending_verifications(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all directives pending verification
    
    Returns directives with low confidence scores first
    """
    try:
        result = await db.execute(
            select(Directive)
            .where(Directive.verification_status == VerificationStatus.PENDING)
            .order_by(Directive.confidence_score.asc())
            .limit(limit)
        )
        directives = result.scalars().all()
        
        return {
            'total': len(directives),
            'items': directives
        }
        
    except Exception as e:
        logger.error(f"Error getting pending verifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{directive_id}", response_model=DirectiveWithHighlight)
async def get_directive_for_verification(
    directive_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get directive details with PDF highlight information for verification
    """
    try:
        result = await db.execute(
            select(Directive).where(Directive.id == directive_id)
        )
        directive = result.scalar_one_or_none()
        
        if not directive:
            raise HTTPException(status_code=404, detail="Directive not found")
        
        return directive
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting directive: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{directive_id}/verify", response_model=DirectiveResponse)
async def verify_directive(
    directive_id: str,
    verification: DirectiveVerification,
    db: AsyncSession = Depends(get_db)
):
    """
    Unified endpoint to verify a directive (approve or reject)
    
    - **verified**: True to approve, False to reject
    - **notes**: Verification notes
    - **corrections**: Optional corrections to apply
    """
    try:
        result = await db.execute(
            select(Directive).where(Directive.id == directive_id)
        )
        directive = result.scalar_one_or_none()
        
        if not directive:
            raise HTTPException(status_code=404, detail="Directive not found")
        
        verified_by = "system_user"  # TODO: Get from auth
        
        if verification.verified:
            # APPROVE path
            # Save original if not already saved
            if not directive.original_directive_text:
                directive.original_directive_text = directive.directive_text
            
            # Apply corrections if provided
            has_edits = False
            if verification.directive_text and verification.directive_text != directive.directive_text:
                directive.directive_text = verification.directive_text
                has_edits = True
            
            if verification.directive_type and verification.directive_type != directive.directive_type:
                directive.directive_type = verification.directive_type
                has_edits = True
            
            if verification.priority and verification.priority != directive.priority:
                directive.priority = verification.priority
                has_edits = True
            
            if verification.action_required and verification.action_required != directive.action_required:
                directive.action_required = verification.action_required
                has_edits = True
            
            if verification.responsible_entity and verification.responsible_entity != directive.responsible_entity:
                directive.responsible_entity = verification.responsible_entity
                has_edits = True
            
            if verification.deadline and verification.deadline != directive.deadline:
                directive.deadline = verification.deadline
                has_edits = True
            
            if verification.assigned_department and verification.assigned_department != directive.assigned_department:
                directive.assigned_department = verification.assigned_department
                has_edits = True
            
            # Set status based on whether edits were made
            if has_edits:
                directive.verification_status = VerificationStatus.EDITED
                directive.is_edited = True
            else:
                directive.verification_status = VerificationStatus.APPROVED
            
            logger.info(f"Directive {directive_id} approved by {verified_by}")
        else:
            # REJECT path
            directive.verification_status = VerificationStatus.REJECTED
            logger.info(f"Directive {directive_id} rejected by {verified_by}")
        
        # Common updates
        directive.verified_by = verified_by
        from datetime import datetime
        directive.verified_at = datetime.utcnow()
        if verification.verification_notes:
            directive.verification_notes = verification.verification_notes
        
        await db.commit()
        await db.refresh(directive)
        
        return directive
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying directive: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{directive_id}/assign-department", response_model=DirectiveResponse)
async def assign_department_to_directive(
    directive_id: str,
    request: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Assign a department to a directive
    """
    try:
        department = request.get('department')
        if not department:
            raise HTTPException(status_code=400, detail="Department is required")
        
        result = await db.execute(
            select(Directive).where(Directive.id == directive_id)
        )
        directive = result.scalar_one_or_none()
        
        if not directive:
            raise HTTPException(status_code=404, detail="Directive not found")
        
        directive.assigned_department = department
        directive.is_edited = True
        
        await db.commit()
        await db.refresh(directive)
        
        logger.info(f"Directive {directive_id} assigned to {department}")
        return directive
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning department: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{directive_id}/approve", response_model=DirectiveResponse)
async def approve_directive(
    directive_id: str,
    verified_by: str,  # TODO: Get from auth
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a directive without modifications
    """
    try:
        result = await db.execute(
            select(Directive).where(Directive.id == directive_id)
        )
        directive = result.scalar_one_or_none()
        
        if not directive:
            raise HTTPException(status_code=404, detail="Directive not found")
        
        # Update verification status
        directive.verification_status = VerificationStatus.APPROVED
        directive.verified_by = verified_by
        from datetime import datetime
        directive.verified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(directive)
        
        logger.info(f"Directive {directive_id} approved by {verified_by}")
        return directive
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving directive: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{directive_id}/edit", response_model=DirectiveResponse)
async def edit_and_approve_directive(
    directive_id: str,
    verification: DirectiveVerification,
    verified_by: str,  # TODO: Get from auth
    db: AsyncSession = Depends(get_db)
):
    """
    Edit and approve a directive
    """
    try:
        result = await db.execute(
            select(Directive).where(Directive.id == directive_id)
        )
        directive = result.scalar_one_or_none()
        
        if not directive:
            raise HTTPException(status_code=404, detail="Directive not found")
        
        # Save original if not already saved
        if not directive.original_directive_text:
            directive.original_directive_text = directive.directive_text
        
        # Update fields if provided
        if verification.directive_text:
            directive.directive_text = verification.directive_text
            directive.is_edited = True
        
        if verification.directive_type:
            directive.directive_type = verification.directive_type
            directive.is_edited = True
        
        if verification.priority:
            directive.priority = verification.priority
            directive.is_edited = True
        
        if verification.action_required:
            directive.action_required = verification.action_required
            directive.is_edited = True
        
        if verification.responsible_entity:
            directive.responsible_entity = verification.responsible_entity
            directive.is_edited = True
        
        if verification.deadline:
            directive.deadline = verification.deadline
            directive.is_edited = True
        
        if verification.assigned_department:
            directive.assigned_department = verification.assigned_department
            directive.is_edited = True
        
        # Update verification status
        directive.verification_status = VerificationStatus.EDITED
        directive.verified_by = verified_by
        from datetime import datetime
        directive.verified_at = datetime.utcnow()
        directive.verification_notes = verification.verification_notes
        
        await db.commit()
        await db.refresh(directive)
        
        logger.info(f"Directive {directive_id} edited and approved by {verified_by}")
        return directive
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing directive: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{directive_id}/reject", response_model=DirectiveResponse)
async def reject_directive(
    directive_id: str,
    reason: str,
    verified_by: str,  # TODO: Get from auth
    db: AsyncSession = Depends(get_db)
):
    """
    Reject a directive (mark as incorrect extraction)
    """
    try:
        result = await db.execute(
            select(Directive).where(Directive.id == directive_id)
        )
        directive = result.scalar_one_or_none()
        
        if not directive:
            raise HTTPException(status_code=404, detail="Directive not found")
        
        # Update verification status
        directive.verification_status = VerificationStatus.REJECTED
        directive.verified_by = verified_by
        from datetime import datetime
        directive.verified_at = datetime.utcnow()
        directive.verification_notes = reason
        
        await db.commit()
        await db.refresh(directive)
        
        logger.info(f"Directive {directive_id} rejected by {verified_by}: {reason}")
        return directive
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting directive: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
async def get_verification_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Get verification statistics
    """
    try:
        # Get counts by status
        result = await db.execute(select(Directive))
        all_directives = result.scalars().all()
        
        stats = {
            'total': len(all_directives),
            'pending': sum(1 for d in all_directives if d.verification_status == VerificationStatus.PENDING),
            'approved': sum(1 for d in all_directives if d.verification_status == VerificationStatus.APPROVED),
            'edited': sum(1 for d in all_directives if d.verification_status == VerificationStatus.EDITED),
            'rejected': sum(1 for d in all_directives if d.verification_status == VerificationStatus.REJECTED),
            'low_confidence': sum(1 for d in all_directives if d.confidence_score < 0.5),
            'high_confidence': sum(1 for d in all_directives if d.confidence_score >= 0.8),
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting verification stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
