"""
Judgment Processing Service
Orchestrates the complete judgment processing pipeline
"""
from typing import Dict, Any, List, Optional
from pathlib import Path
import uuid
from datetime import datetime
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.judgment import Judgment, ProcessingStatus
from app.models.directive import Directive
from app.services.ocr.pdf_processor import pdf_processor
from app.services.ai.llm_service import llm_service
from app.core.config import settings


class JudgmentService:
    """Service for judgment processing operations"""
    
    async def upload_judgment(
        self,
        db: AsyncSession,
        file_path: str,
        case_data: Dict[str, Any],
        uploaded_by: str
    ) -> Judgment:
        """
        Upload and register a new judgment
        
        Args:
            db: Database session
            file_path: Path to uploaded PDF
            case_data: Case metadata
            uploaded_by: User ID who uploaded
        
        Returns:
            Created Judgment object
        """
        try:
            logger.info(f"Uploading judgment for case: {case_data.get('case_id')}")
            
            # Extract PDF metadata and text for case ID extraction
            pdf_metadata = pdf_processor.get_pdf_metadata(file_path)
            
            # Try to extract case information from PDF if not provided
            extracted_info = {}
            if not case_data.get('case_id') or case_data.get('auto_extract', False):
                logger.info("Attempting to extract case information from PDF...")
                pdf_data = await pdf_processor.process_pdf(file_path)
                extracted_info = pdf_data.get('extracted_info', {})
                
                # Use extracted case ID if not provided
                if not case_data.get('case_id') and extracted_info.get('case_id'):
                    case_data['case_id'] = extracted_info['case_id']
                    logger.info(f"Using extracted case ID: {case_data['case_id']}")
                
                # Use extracted court name if not provided
                if not case_data.get('court_name') and extracted_info.get('court_name'):
                    case_data['court_name'] = extracted_info['court_name']
                    logger.info(f"Using extracted court name: {case_data['court_name']}")
                
                # Use extracted parties if not provided
                if not case_data.get('petitioner') and extracted_info.get('petitioner'):
                    case_data['petitioner'] = extracted_info['petitioner']
                    logger.info(f"Using extracted petitioner: {case_data['petitioner']}")
                
                if not case_data.get('respondent') and extracted_info.get('respondent'):
                    case_data['respondent'] = extracted_info['respondent']
                    logger.info(f"Using extracted respondent: {case_data['respondent']}")
            
            # Validate required fields
            if not case_data.get('case_id'):
                raise ValueError("Case ID is required and could not be extracted from document")
            
            if not case_data.get('court_name'):
                raise ValueError("Court name is required and could not be extracted from document")
            
            # Create judgment record
            judgment = Judgment(
                id=str(uuid.uuid4()),
                case_id=case_data['case_id'],
                case_type=case_data['case_type'],
                court_name=case_data['court_name'],
                judge_name=case_data.get('judge_name'),
                judgment_date=case_data.get('judgment_date'),
                petitioner=case_data.get('petitioner'),
                respondent=case_data.get('respondent'),
                document_path=file_path,
                document_hash=pdf_metadata['file_hash'],
                file_size=pdf_metadata['file_size'],
                page_count=pdf_metadata['page_count'],
                status=ProcessingStatus.UPLOADED,
                case_metadata={
                    **case_data.get('metadata', {}),
                    'extracted_info': extracted_info if extracted_info else None
                },
                uploaded_by=uploaded_by
            )
            
            db.add(judgment)
            await db.commit()
            await db.refresh(judgment)
            
            logger.info(f"Judgment uploaded successfully: {judgment.id}")
            return judgment
            
        except Exception as e:
            logger.error(f"Error uploading judgment: {e}")
            await db.rollback()
            raise
    
    async def process_judgment(
        self,
        db: AsyncSession,
        judgment_id: str
    ) -> Dict[str, Any]:
        """
        Process judgment through complete AI pipeline
        
        Args:
            db: Database session
            judgment_id: Judgment ID to process
        
        Returns:
            Processing result
        """
        try:
            logger.info(f"Processing judgment: {judgment_id}")
            
            # Get judgment
            result = await db.execute(
                select(Judgment).where(Judgment.id == judgment_id)
            )
            judgment = result.scalar_one_or_none()
            
            if not judgment:
                raise ValueError(f"Judgment not found: {judgment_id}")
            
            # Update status to processing
            judgment.status = ProcessingStatus.PROCESSING
            await db.commit()
            
            # Step 1: PDF Processing and OCR
            logger.info("Step 1: PDF Processing")
            pdf_data = await pdf_processor.process_pdf(judgment.document_path)
            
            if pdf_data['processing_status'] != 'success':
                judgment.status = ProcessingStatus.FAILED
                await db.commit()
                raise Exception(f"PDF processing failed: {pdf_data.get('error')}")
            
            # Save extracted text
            judgment.raw_text = pdf_data['full_text']
            await db.commit()
            
            # Step 2: AI Directive Extraction
            logger.info("Step 2: Directive Extraction")
            case_context = {
                'case_id': judgment.case_id,
                'court_name': judgment.court_name,
                'judgment_date': judgment.judgment_date.isoformat() if judgment.judgment_date else None,
                'case_type': judgment.case_type.value
            }
            
            directives_data = await llm_service.extract_directives(
                pdf_data['full_text'],
                case_context
            )
            
            # Step 3: Department Assignment
            logger.info("Step 3: Department Assignment")
            department_mapping = self._load_department_mapping()
            
            directives = []
            for directive_data in directives_data:
                # Assign department
                assignment = await llm_service.assign_department(
                    directive_data,
                    department_mapping
                )
                
                # Create directive record
                directive = Directive(
                    id=str(uuid.uuid4()),
                    judgment_id=judgment.id,
                    directive_text=directive_data['directive_text'],
                    directive_type=directive_data['directive_type'],
                    priority=directive_data['priority'],
                    confidence_score=directive_data['confidence_score'],
                    source_page_number=directive_data.get('source_page_number'),
                    source_text_highlight=directive_data.get('source_text_highlight'),
                    action_required=directive_data.get('action_required'),
                    responsible_entity=directive_data.get('responsible_entity'),
                    deadline_text=directive_data.get('deadline_text'),
                    assigned_department=assignment.get('assigned_department'),
                    assignment_confidence=assignment.get('confidence_score'),
                    metadata={
                        'assignment_reasoning': assignment.get('reasoning')
                    }
                )
                
                # Parse deadline if present
                if directive_data.get('deadline'):
                    try:
                        directive.deadline = datetime.fromisoformat(directive_data['deadline'])
                    except:
                        pass
                
                directives.append(directive)
                db.add(directive)
            
            # Update judgment status
            judgment.status = ProcessingStatus.EXTRACTED
            judgment.processed_at = datetime.utcnow()
            
            # Extract departments involved
            departments = list(set([
                d.assigned_department for d in directives 
                if d.assigned_department
            ]))
            judgment.departments_involved = departments
            
            await db.commit()
            
            logger.info(f"Judgment processed successfully: {len(directives)} directives extracted")
            
            return {
                'judgment_id': judgment.id,
                'status': 'success',
                'directives_count': len(directives),
                'departments_involved': departments,
                'low_confidence_count': sum(1 for d in directives if d.confidence_score < settings.LOW_CONFIDENCE_THRESHOLD)
            }
            
        except Exception as e:
            logger.error(f"Error processing judgment: {e}")
            
            # Update status to failed
            if judgment:
                judgment.status = ProcessingStatus.FAILED
                await db.commit()
            
            raise
    
    async def get_judgment(
        self,
        db: AsyncSession,
        judgment_id: str
    ) -> Optional[Judgment]:
        """
        Get judgment by ID
        
        Args:
            db: Database session
            judgment_id: Judgment ID
        
        Returns:
            Judgment object or None
        """
        result = await db.execute(
            select(Judgment).where(Judgment.id == judgment_id)
        )
        return result.scalar_one_or_none()
    
    async def list_judgments(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        department: Optional[str] = None
    ) -> List[Judgment]:
        """
        List judgments with filters
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records
            status: Filter by status
            department: Filter by department
        
        Returns:
            List of judgments
        """
        query = select(Judgment)
        
        if status:
            query = query.where(Judgment.status == status)
        
        if department:
            query = query.where(Judgment.departments_involved.contains([department]))
        
        query = query.offset(skip).limit(limit).order_by(Judgment.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_directives(
        self,
        db: AsyncSession,
        judgment_id: str
    ) -> List[Directive]:
        """
        Get all directives for a judgment
        
        Args:
            db: Database session
            judgment_id: Judgment ID
        
        Returns:
            List of directives
        """
        result = await db.execute(
            select(Directive)
            .where(Directive.judgment_id == judgment_id)
            .order_by(Directive.priority.desc(), Directive.confidence_score.desc())
        )
        return result.scalars().all()
    
    def _load_department_mapping(self) -> Dict[str, Any]:
        """
        Load department mapping configuration
        
        Returns:
            Department mapping data
        """
        import json
        from pathlib import Path
        
        mapping_file = Path(settings.DEPARTMENT_MAPPING_FILE)
        
        if mapping_file.exists():
            with open(mapping_file, 'r') as f:
                return json.load(f)
        else:
            logger.warning(f"Department mapping file not found: {mapping_file}")
            # Return default mapping
            return {
                'departments': [
                    {
                        'id': 'finance',
                        'name': 'Finance Department',
                        'description': 'Handles financial matters, budgets, compensation, monetary relief'
                    },
                    {
                        'id': 'pwd',
                        'name': 'Public Works Department',
                        'description': 'Infrastructure, construction, roads, buildings, public facilities'
                    },
                    {
                        'id': 'health',
                        'name': 'Health Department',
                        'description': 'Healthcare, hospitals, medical facilities, public health'
                    },
                    {
                        'id': 'education',
                        'name': 'Education Department',
                        'description': 'Schools, universities, educational institutions, academic matters'
                    },
                    {
                        'id': 'home',
                        'name': 'Home Department',
                        'description': 'Law and order, police, internal security, prisons'
                    },
                    {
                        'id': 'environment',
                        'name': 'Environment Department',
                        'description': 'Environmental protection, pollution control, forests, wildlife'
                    },
                    {
                        'id': 'transport',
                        'name': 'Transport Department',
                        'description': 'Transportation, vehicles, traffic, public transport'
                    },
                    {
                        'id': 'urban',
                        'name': 'Urban Development',
                        'description': 'Urban planning, municipal matters, city development'
                    },
                    {
                        'id': 'rural',
                        'name': 'Rural Development',
                        'description': 'Rural areas, villages, agricultural infrastructure'
                    },
                    {
                        'id': 'law',
                        'name': 'Law Department',
                        'description': 'Legal matters, legislation, legal advice, appeals'
                    }
                ]
            }


# Singleton instance
judgment_service = JudgmentService()
