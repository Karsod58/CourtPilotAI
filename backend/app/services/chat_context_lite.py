"""
Lightweight Context Retriever for Chat
Uses SQL queries instead of embeddings for memory efficiency
Memory footprint: ~0MB (vs 350MB for RAG)
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from loguru import logger

from app.models.judgment import Judgment
from app.models.directive import Directive


class LightweightContextRetriever:
    """
    Retrieves judgment context using SQL queries instead of embeddings
    """
    
    async def search_judgments(
        self,
        db: AsyncSession,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search judgments using SQL text search
        
        Args:
            db: Database session
            query: User's search query
            limit: Maximum results
            
        Returns:
            List of relevant judgments with context
        """
        try:
            # Extract search terms from query
            search_terms = self._extract_search_terms(query)
            
            # Build SQL query with text search
            conditions = []
            for term in search_terms:
                term_pattern = f"%{term}%"
                conditions.append(
                    or_(
                        Judgment.case_id.ilike(term_pattern),
                        Judgment.court_name.ilike(term_pattern),
                        Judgment.petitioner.ilike(term_pattern),
                        Judgment.respondent.ilike(term_pattern),
                        Judgment.summary.ilike(term_pattern),
                        Judgment.raw_text.ilike(term_pattern)
                    )
                )
            
            # Execute query
            if conditions:
                query_stmt = select(Judgment).where(
                    or_(*conditions)
                ).limit(limit)
            else:
                # No search terms, return recent judgments
                query_stmt = select(Judgment).order_by(
                    Judgment.created_at.desc()
                ).limit(limit)
            
            result = await db.execute(query_stmt)
            judgments = result.scalars().all()
            
            # Format results
            context_items = []
            for judgment in judgments:
                # Get directives for this judgment
                directive_result = await db.execute(
                    select(Directive).where(
                        Directive.judgment_id == judgment.id
                    ).limit(10)
                )
                directives = directive_result.scalars().all()
                
                context_items.append({
                    'type': 'judgment',
                    'judgment_id': judgment.id,
                    'case_id': judgment.case_id,
                    'court_name': judgment.court_name,
                    'summary': judgment.summary,
                    'petitioner': judgment.petitioner,
                    'respondent': judgment.respondent,
                    'judgment_date': judgment.judgment_date.isoformat() if judgment.judgment_date else None,
                    'directives_count': len(directives),
                    'directives': [
                        {
                            'text': d.directive_text,
                            'type': d.directive_type.value if hasattr(d.directive_type, 'value') else str(d.directive_type),
                            'department': d.assigned_department,
                            'priority': d.priority.value if hasattr(d.priority, 'value') else str(d.priority)
                        }
                        for d in directives[:5]  # Top 5 directives
                    ]
                })
            
            logger.info(f"Found {len(context_items)} judgments for query: {query}")
            return context_items
            
        except Exception as e:
            logger.error(f"Error searching judgments: {e}")
            return []
    
    async def search_by_department(
        self,
        db: AsyncSession,
        department: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search judgments by department"""
        try:
            query_stmt = select(Judgment).where(
                Judgment.departments_involved.contains([department])
            ).limit(limit)
            
            result = await db.execute(query_stmt)
            judgments = result.scalars().all()
            
            return await self._format_judgments(db, judgments)
            
        except Exception as e:
            logger.error(f"Error searching by department: {e}")
            return []
    
    async def search_by_case_id(
        self,
        db: AsyncSession,
        case_id: str
    ) -> Optional[Dict[str, Any]]:
        """Search judgment by exact case ID"""
        try:
            result = await db.execute(
                select(Judgment).where(Judgment.case_id == case_id)
            )
            judgment = result.scalar_one_or_none()
            
            if judgment:
                formatted = await self._format_judgments(db, [judgment])
                return formatted[0] if formatted else None
            return None
            
        except Exception as e:
            logger.error(f"Error searching by case ID: {e}")
            return None
    
    async def get_recent_judgments(
        self,
        db: AsyncSession,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get most recent judgments"""
        try:
            result = await db.execute(
                select(Judgment).order_by(
                    Judgment.created_at.desc()
                ).limit(limit)
            )
            judgments = result.scalars().all()
            
            return await self._format_judgments(db, judgments)
            
        except Exception as e:
            logger.error(f"Error getting recent judgments: {e}")
            return []
    
    async def search_directives(
        self,
        db: AsyncSession,
        query: str,
        department: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search directives directly
        
        Args:
            db: Database session
            query: Search query
            department: Filter by department
            priority: Filter by priority
            limit: Maximum results
            
        Returns:
            List of relevant directives with judgment context
        """
        try:
            # Build query
            search_terms = self._extract_search_terms(query)
            conditions = []
            
            for term in search_terms:
                term_pattern = f"%{term}%"
                conditions.append(
                    or_(
                        Directive.directive_text.ilike(term_pattern),
                        Directive.action_required.ilike(term_pattern),
                        Directive.responsible_entity.ilike(term_pattern)
                    )
                )
            
            # Add filters
            if department:
                conditions.append(Directive.assigned_department == department)
            
            if priority:
                conditions.append(Directive.priority == priority)
            
            # Execute query
            if conditions:
                query_stmt = select(Directive).where(
                    and_(*conditions)
                ).limit(limit)
            else:
                query_stmt = select(Directive).limit(limit)
            
            result = await db.execute(query_stmt)
            directives = result.scalars().all()
            
            # Format with judgment context
            context_items = []
            for directive in directives:
                # Get judgment
                judgment_result = await db.execute(
                    select(Judgment).where(Judgment.id == directive.judgment_id)
                )
                judgment = judgment_result.scalar_one_or_none()
                
                context_items.append({
                    'type': 'directive',
                    'directive_id': directive.id,
                    'text': directive.directive_text,
                    'directive_type': directive.directive_type.value if hasattr(directive.directive_type, 'value') else str(directive.directive_type),
                    'department': directive.assigned_department,
                    'priority': directive.priority.value if hasattr(directive.priority, 'value') else str(directive.priority),
                    'judgment': {
                        'id': judgment.id,
                        'case_id': judgment.case_id,
                        'court_name': judgment.court_name
                    } if judgment else None
                })
            
            logger.info(f"Found {len(context_items)} directives for query: {query}")
            return context_items
            
        except Exception as e:
            logger.error(f"Error searching directives: {e}")
            return []
    
    def _extract_search_terms(self, query: str) -> List[str]:
        """
        Extract meaningful search terms from query
        
        Args:
            query: User's query
            
        Returns:
            List of search terms
        """
        # Remove common words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'can', 'about', 'what',
            'which', 'who', 'when', 'where', 'why', 'how', 'tell', 'me', 'show',
            'find', 'get', 'give', 'case', 'judgment', 'directive'
        }
        
        # Extract words
        words = query.lower().split()
        
        # Filter stop words and short words
        terms = [
            word.strip('.,!?;:')
            for word in words
            if len(word) > 2 and word.lower() not in stop_words
        ]
        
        return terms[:5]  # Limit to 5 terms
    
    async def _format_judgments(
        self,
        db: AsyncSession,
        judgments: List[Judgment]
    ) -> List[Dict[str, Any]]:
        """Format judgments with directives"""
        context_items = []
        
        for judgment in judgments:
            # Get directives
            directive_result = await db.execute(
                select(Directive).where(
                    Directive.judgment_id == judgment.id
                ).limit(10)
            )
            directives = directive_result.scalars().all()
            
            context_items.append({
                'type': 'judgment',
                'judgment_id': judgment.id,
                'case_id': judgment.case_id,
                'court_name': judgment.court_name,
                'summary': judgment.summary,
                'petitioner': judgment.petitioner,
                'respondent': judgment.respondent,
                'judgment_date': judgment.judgment_date.isoformat() if judgment.judgment_date else None,
                'directives_count': len(directives),
                'directives': [
                    {
                        'text': d.directive_text,
                        'type': d.directive_type.value if hasattr(d.directive_type, 'value') else str(d.directive_type),
                        'department': d.assigned_department,
                        'priority': d.priority.value if hasattr(d.priority, 'value') else str(d.priority)
                    }
                    for d in directives[:5]
                ]
            })
        
        return context_items
    
    def format_context_for_llm(self, context_items: List[Dict[str, Any]]) -> str:
        """
        Format context for LLM prompt
        
        Args:
            context_items: List of context items
            
        Returns:
            Formatted context string
        """
        if not context_items:
            return "No relevant judgments found."
        
        context_parts = []
        
        for i, item in enumerate(context_items, 1):
            if item['type'] == 'judgment':
                context_parts.append(
                    f"[Judgment {i}]\n"
                    f"Case ID: {item['case_id']}\n"
                    f"Court: {item['court_name']}\n"
                    f"Petitioner: {item.get('petitioner', 'N/A')}\n"
                    f"Respondent: {item.get('respondent', 'N/A')}\n"
                    f"Date: {item.get('judgment_date', 'N/A')}\n"
                    f"Summary: {item.get('summary', 'N/A')}\n"
                    f"Directives ({item['directives_count']}):\n"
                )
                
                for j, directive in enumerate(item.get('directives', []), 1):
                    context_parts.append(
                        f"  {j}. {directive['text']}\n"
                        f"     Type: {directive['type']}, "
                        f"Department: {directive['department']}, "
                        f"Priority: {directive['priority']}\n"
                    )
            
            elif item['type'] == 'directive':
                judgment = item.get('judgment', {})
                context_parts.append(
                    f"[Directive {i}]\n"
                    f"Text: {item['text']}\n"
                    f"Type: {item['directive_type']}\n"
                    f"Department: {item['department']}\n"
                    f"Priority: {item['priority']}\n"
                    f"From Case: {judgment.get('case_id', 'N/A')}\n"
                )
        
        return "\n".join(context_parts)


# Global instance
lightweight_context_retriever = LightweightContextRetriever()
