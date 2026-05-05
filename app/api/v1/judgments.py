"""
Judgment API endpoints
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pathlib import Path
import shutil
import uuid
from loguru import logger

from app.core.database import get_db
from app.schemas.judgment import (
    JudgmentUpload,
    JudgmentResponse,
    JudgmentDetail,
    JudgmentList,
    JudgmentStats
)
from app.schemas.directive import DirectiveResponse, DirectiveList
from app.services.judgment_service import judgment_service
from app.core.config import settings

router = APIRouter()


@router.post("/preview", status_code=200)
async def preview_judgment(
    file: UploadFile = File(...)
):
    """
    Preview PDF and extract metadata before upload
    
    - **file**: PDF file to preview
    
    Returns extracted metadata that can be used to auto-fill the upload form
    """
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Validate file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes"
            )
        
        # Save temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            file.file.seek(0)
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
        
        logger.info(f"Processing preview for: {file.filename}")
        
        # Import PDF processor
        from app.services.ocr.pdf_processor import pdf_processor
        
        # Calculate file hash to check for duplicates
        file_hash = pdf_processor.calculate_file_hash(temp_path)
        
        # Check if this file already exists
        from sqlalchemy import select
        from app.models.judgment import Judgment
        
        # Note: We can't use db session here without dependency injection
        # So we'll just extract metadata and let the upload endpoint handle duplicates
        
        # Extract metadata and basic info
        metadata = pdf_processor.get_pdf_metadata(temp_path)
        
        # Extract text from first few pages for quick analysis
        full_text, page_data = pdf_processor.extract_text_from_pdf(temp_path)
        
        # Extract case information
        extracted_case_id = pdf_processor.extract_case_id(full_text)
        extracted_court_name = pdf_processor.extract_court_name(full_text)
        extracted_parties = pdf_processor.extract_parties(full_text)
        extracted_date = pdf_processor.extract_judgment_date(full_text)
        
        # Clean up temp file
        import os
        os.unlink(temp_path)
        
        return {
            'success': True,
            'filename': file.filename,
            'file_size': file_size,
            'file_hash': file_hash,
            'page_count': metadata.get('page_count', 0),
            'extracted_info': {
                'case_id': extracted_case_id,
                'court_name': extracted_court_name,
                'petitioner': extracted_parties.get('petitioner'),
                'respondent': extracted_parties.get('respondent'),
                'judgment_date': extracted_date,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@router.get("/check-duplicate/{file_hash}")
async def check_duplicate(
    file_hash: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a file with this hash already exists
    
    - **file_hash**: SHA256 hash of the file
    
    Returns existing judgment if found, or null if not found
    """
    try:
        from sqlalchemy import select
        from app.models.judgment import Judgment
        
        result = await db.execute(
            select(Judgment).where(Judgment.document_hash == file_hash)
        )
        judgment = result.scalar_one_or_none()
        
        if judgment:
            return {
                'exists': True,
                'judgment': {
                    'id': judgment.id,
                    'case_id': judgment.case_id,
                    'court_name': judgment.court_name,
                    'status': judgment.status.value,
                    'uploaded_at': judgment.uploaded_at.isoformat(),
                    'processed_at': judgment.processed_at.isoformat() if judgment.processed_at else None,
                }
            }
        else:
            return {
                'exists': False,
                'judgment': None
            }
    except Exception as e:
        logger.error(f"Error checking duplicate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=JudgmentResponse, status_code=201)
async def upload_judgment(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    case_type: str = Form(...),
    court_name: Optional[str] = Form(None),
    judge_name: Optional[str] = Form(None),
    judgment_date: Optional[str] = Form(None),
    petitioner: Optional[str] = Form(None),
    respondent: Optional[str] = Form(None),
    auto_extract: bool = Form(True),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a new judgment PDF with optional auto-extraction
    
    - **file**: PDF file to upload
    - **case_id**: Unique case identifier (optional if auto_extract=True)
    - **case_type**: Type of case (civil/criminal/constitutional/special/other)
    - **court_name**: Name of the court (optional if auto_extract=True)
    - **judge_name**: Name of the judge (optional)
    - **judgment_date**: Date of judgment (optional, ISO format)
    - **petitioner**: Petitioner name (optional)
    - **respondent**: Respondent name (optional)
    - **auto_extract**: Auto-extract missing fields from PDF (default: True)
    """
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Validate file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes"
            )
        
        # Save file
        file_id = str(uuid.uuid4())
        file_path = Path(settings.DOCUMENT_STORAGE_PATH) / f"{file_id}.pdf"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved: {file_path}")
        
        # Prepare case data with auto-extraction flag
        case_data = {
            'case_id': case_id,
            'case_type': case_type,
            'court_name': court_name,
            'judge_name': judge_name,
            'petitioner': petitioner,
            'respondent': respondent,
            'auto_extract': auto_extract or not case_id or not court_name,  # Auto-extract if fields missing
        }
        
        if judgment_date:
            from datetime import datetime
            case_data['judgment_date'] = datetime.fromisoformat(judgment_date)
        
        # Upload judgment
        judgment = await judgment_service.upload_judgment(
            db=db,
            file_path=str(file_path),
            case_data=case_data,
            uploaded_by="system"  # TODO: Get from auth
        )
        
        # Trigger background processing
        background_tasks.add_task(
            process_judgment_background,
            judgment.id,
            db
        )
        
        return judgment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading judgment: {e}")
        
        # Check if it's a duplicate file error
        if "Duplicate entry" in str(e) and "document_hash" in str(e):
            raise HTTPException(
                status_code=409, 
                detail="This PDF file has already been uploaded. Please upload a different file or check existing judgments."
            )
        
        raise HTTPException(status_code=500, detail=str(e))


async def process_judgment_background(judgment_id: str, db: AsyncSession):
    """Background task to process judgment"""
    try:
        await judgment_service.process_judgment(db, judgment_id)
    except Exception as e:
        logger.error(f"Background processing failed for {judgment_id}: {e}")


@router.post("/{judgment_id}/process")
async def process_judgment(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger processing of a judgment
    
    - **judgment_id**: ID of the judgment to process
    """
    try:
        result = await judgment_service.process_judgment(db, judgment_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing judgment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=JudgmentList)
async def list_judgments(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all judgments with pagination and filters
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Filter by processing status
    - **department**: Filter by department
    """
    try:
        # Validate page_size
        page_size = min(page_size, 100)
        skip = (page - 1) * page_size
        
        # Get judgments
        judgments = await judgment_service.list_judgments(
            db=db,
            skip=skip,
            limit=page_size,
            status=status,
            department=department
        )
        
        # Get total count (simplified - in production, use a count query)
        total = len(judgments)  # TODO: Implement proper count
        
        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'items': judgments
        }
        
    except Exception as e:
        logger.error(f"Error listing judgments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{judgment_id}", response_model=JudgmentDetail)
async def get_judgment(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific judgment
    
    - **judgment_id**: ID of the judgment
    """
    try:
        judgment = await judgment_service.get_judgment(db, judgment_id)
        
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        return judgment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting judgment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{judgment_id}/directives", response_model=DirectiveList)
async def get_judgment_directives(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all directives extracted from a judgment
    
    - **judgment_id**: ID of the judgment
    """
    try:
        # Verify judgment exists
        judgment = await judgment_service.get_judgment(db, judgment_id)
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Get directives
        directives = await judgment_service.get_directives(db, judgment_id)
        
        return {
            'total': len(directives),
            'items': directives
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting directives: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{judgment_id}/status")
async def get_judgment_status(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get processing status of a judgment
    
    - **judgment_id**: ID of the judgment
    """
    try:
        judgment = await judgment_service.get_judgment(db, judgment_id)
        
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Get directives count
        directives = await judgment_service.get_directives(db, judgment_id)
        
        return {
            'judgment_id': judgment.id,
            'case_id': judgment.case_id,
            'status': judgment.status.value,
            'uploaded_at': judgment.uploaded_at,
            'processed_at': judgment.processed_at,
            'directives_count': len(directives),
            'departments_involved': judgment.departments_involved,
            'page_count': judgment.page_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting judgment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/overview", response_model=JudgmentStats)
async def get_judgment_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Get overall judgment statistics
    """
    try:
        # TODO: Implement proper statistics aggregation
        # This is a placeholder implementation
        
        return {
            'total_judgments': 0,
            'pending_actions': 0,
            'completed_actions': 0,
            'overdue_actions': 0,
            'by_status': {},
            'by_department': {},
            'by_priority': {}
        }
        
    except Exception as e:
        logger.error(f"Error getting judgment stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
