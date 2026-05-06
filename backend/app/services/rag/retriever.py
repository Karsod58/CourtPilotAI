"""
Context Retriever for RAG Pipeline
Retrieves relevant context from judgments and directives
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.models.judgment import Judgment
from app.models.directive import Directive
from app.services.rag.embeddings import embedding_service
from app.services.rag.vector_store import vector_store


class ContextRetriever:
    """
    Retrieves relevant context for chat queries
    """
    
    def __init__(self):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
    
    async def index_judgment(self, judgment: Judgment, directives: List[Directive] = None):
        """
        Index a judgment and its directives for retrieval
        
        Args:
            judgment: Judgment object to index
            directives: Optional list of directives for this judgment
        """
        try:
            # Index judgment summary and metadata
            judgment_text = self._prepare_judgment_text(judgment)
            judgment_embedding = self.embedding_service.encode_single(judgment_text)
            
            if judgment_embedding is not None:
                self.vector_store.add(
                    doc_id=f"judgment_{judgment.id}",
                    embedding=judgment_embedding,
                    metadata={
                        'type': 'judgment',
                        'judgment_id': judgment.id,
                        'case_id': judgment.case_id,
                        'court_name': judgment.court_name,
                        'text': judgment_text[:500],  # Store snippet
                        'full_text': judgment.raw_text[:2000] if judgment.raw_text else judgment_text,
                        'status': judgment.status.value if hasattr(judgment.status, 'value') else str(judgment.status),
                        'departments': judgment.departments_involved or []
                    }
                )
                logger.info(f"Indexed judgment {judgment.case_id}")
            
            # Index directives
            if directives:
                for directive in directives:
                    await self.index_directive(directive)
        
        except Exception as e:
            logger.error(f"Error indexing judgment {judgment.id}: {e}")
    
    async def index_directive(self, directive: Directive):
        """
        Index a single directive
        
        Args:
            directive: Directive object to index
        """
        try:
            directive_text = self._prepare_directive_text(directive)
            directive_embedding = self.embedding_service.encode_single(directive_text)
            
            if directive_embedding is not None:
                self.vector_store.add(
                    doc_id=f"directive_{directive.id}",
                    embedding=directive_embedding,
                    metadata={
                        'type': 'directive',
                        'directive_id': directive.id,
                        'judgment_id': directive.judgment_id,
                        'text': directive.directive_text,
                        'directive_type': directive.directive_type.value if hasattr(directive.directive_type, 'value') else str(directive.directive_type),
                        'priority': directive.priority.value if hasattr(directive.priority, 'value') else str(directive.priority),
                        'department': directive.assigned_department or directive.responsible_entity,
                        'confidence': directive.confidence_score,
                        'status': directive.verification_status.value if hasattr(directive.verification_status, 'value') else str(directive.verification_status)
                    }
                )
        
        except Exception as e:
            logger.error(f"Error indexing directive {directive.id}: {e}")
    
    async def index_all_judgments(self, db: AsyncSession):
        """
        Index all judgments and directives in the database
        
        Args:
            db: Database session
        """
        try:
            logger.info("Starting full index of judgments and directives...")
            
            # Get all judgments
            result = await db.execute(select(Judgment))
            judgments = result.scalars().all()
            
            for judgment in judgments:
                # Get directives for this judgment
                directive_result = await db.execute(
                    select(Directive).where(Directive.judgment_id == judgment.id)
                )
                directives = directive_result.scalars().all()
                
                await self.index_judgment(judgment, directives)
            
            # Save the index
            self.vector_store.save()
            
            stats = self.vector_store.get_stats()
            logger.info(f"Indexing complete: {stats['total_vectors']} vectors indexed")
            
            return stats
        
        except Exception as e:
            logger.error(f"Error during full indexing: {e}")
            return {'error': str(e)}
    
    def retrieve_context(self, query: str, k: int = 5, filter_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context for a query
        
        Args:
            query: User query
            k: Number of results to retrieve
            filter_type: Optional filter by type ('judgment' or 'directive')
            
        Returns:
            List of relevant documents with metadata
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.encode_single(query)
            
            if query_embedding is None:
                logger.warning("Could not generate query embedding")
                return []
            
            # Search vector store
            results = self.vector_store.search(query_embedding, k=k * 2)  # Get more, then filter
            
            # Filter by type if specified
            if filter_type:
                results = [r for r in results if r.get('type') == filter_type]
            
            # Return top k
            return results[:k]
        
        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return []
    
    def format_context_for_llm(self, context_docs: List[Dict[str, Any]]) -> str:
        """
        Format retrieved context for LLM prompt
        
        Args:
            context_docs: List of retrieved documents
            
        Returns:
            Formatted context string
        """
        if not context_docs:
            return "No relevant context found."
        
        context_parts = []
        
        for i, doc in enumerate(context_docs, 1):
            if doc['type'] == 'judgment':
                context_parts.append(
                    f"[Judgment {i}]\n"
                    f"Case ID: {doc.get('case_id', 'N/A')}\n"
                    f"Court: {doc.get('court_name', 'N/A')}\n"
                    f"Status: {doc.get('status', 'N/A')}\n"
                    f"Content: {doc.get('full_text', doc.get('text', 'N/A'))}\n"
                )
            elif doc['type'] == 'directive':
                context_parts.append(
                    f"[Directive {i}]\n"
                    f"Type: {doc.get('directive_type', 'N/A')}\n"
                    f"Priority: {doc.get('priority', 'N/A')}\n"
                    f"Department: {doc.get('department', 'N/A')}\n"
                    f"Text: {doc.get('text', 'N/A')}\n"
                    f"Status: {doc.get('status', 'N/A')}\n"
                )
        
        return "\n---\n".join(context_parts)
    
    def _prepare_judgment_text(self, judgment: Judgment) -> str:
        """Prepare judgment text for embedding"""
        parts = [
            f"Case ID: {judgment.case_id}",
            f"Court: {judgment.court_name}",
            f"Case Type: {judgment.case_type.value if hasattr(judgment.case_type, 'value') else str(judgment.case_type)}",
        ]
        
        if judgment.petitioner:
            parts.append(f"Petitioner: {judgment.petitioner}")
        if judgment.respondent:
            parts.append(f"Respondent: {judgment.respondent}")
        if judgment.summary:
            parts.append(f"Summary: {judgment.summary}")
        elif judgment.raw_text:
            # Use first 1000 chars of raw text
            parts.append(f"Content: {judgment.raw_text[:1000]}")
        
        return " | ".join(parts)
    
    def _prepare_directive_text(self, directive: Directive) -> str:
        """Prepare directive text for embedding"""
        parts = [
            f"Directive: {directive.directive_text}",
            f"Type: {directive.directive_type.value if hasattr(directive.directive_type, 'value') else str(directive.directive_type)}",
            f"Priority: {directive.priority.value if hasattr(directive.priority, 'value') else str(directive.priority)}",
        ]
        
        if directive.action_required:
            parts.append(f"Action: {directive.action_required}")
        if directive.assigned_department:
            parts.append(f"Department: {directive.assigned_department}")
        if directive.responsible_entity:
            parts.append(f"Responsible: {directive.responsible_entity}")
        
        return " | ".join(parts)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get retriever statistics"""
        return {
            **self.vector_store.get_stats(),
            'embedding_model': self.embedding_service.model_name,
            'embedding_dimension': self.embedding_service.embedding_dim
        }


# Global context retriever instance
context_retriever = ContextRetriever()
