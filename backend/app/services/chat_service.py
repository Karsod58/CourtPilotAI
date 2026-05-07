"""
Chat Service for Officials
Handles conversational AI for queries about judgments and documents
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
import uuid
from datetime import datetime
from loguru import logger

from app.models.chat import ChatSession, ChatMessage
from app.models.judgment import Judgment
from app.models.directive import Directive
from app.services.ai.llm_service import llm_service
from app.services.rag.retriever import context_retriever
from app.services.chat_context_lite import lightweight_context_retriever
import asyncio


class ChatService:
    """Service for chat operations"""
    
    async def create_session(
        self,
        db: AsyncSession,
        user_id: str,
        user_name: str,
        judgment_id: Optional[str] = None,
        context_type: str = "general"
    ) -> ChatSession:
        """
        Create a new chat session
        
        Args:
            db: Database session
            user_id: User ID
            user_name: User name
            judgment_id: Optional judgment ID for context
            context_type: Type of context (judgment, directive, general)
        
        Returns:
            Created ChatSession
        """
        try:
            session = ChatSession(
                id=str(uuid.uuid4()),
                user_id=user_id,
                user_name=user_name,
                judgment_id=judgment_id,
                context_type=context_type,
                title=f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                is_active=True,
                last_message_at=datetime.utcnow()
            )
            
            db.add(session)
            await db.commit()
            await db.refresh(session)
            
            logger.info(f"Created chat session {session.id} for user {user_name}")
            return session
            
        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            await db.rollback()
            raise
    
    async def get_session(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Optional[ChatSession]:
        """Get chat session by ID"""
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        return result.scalar_one_or_none()
    
    async def get_user_sessions(
        self,
        db: AsyncSession,
        user_id: str,
        active_only: bool = True
    ) -> List[ChatSession]:
        """Get all sessions for a user"""
        query = select(ChatSession).where(ChatSession.user_id == user_id)
        
        if active_only:
            query = query.where(ChatSession.is_active == True)
        
        query = query.order_by(desc(ChatSession.last_message_at))
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def add_message(
        self,
        db: AsyncSession,
        session_id: str,
        role: str,
        content: str,
        context_used: Optional[Dict[str, Any]] = None,
        sources: Optional[List[Dict[str, Any]]] = None
    ) -> ChatMessage:
        """
        Add a message to a chat session
        
        Args:
            db: Database session
            session_id: Chat session ID
            role: Message role (user/assistant/system)
            content: Message content
            context_used: Context information used
            sources: Source references
        
        Returns:
            Created ChatMessage
        """
        try:
            message = ChatMessage(
                id=str(uuid.uuid4()),
                session_id=session_id,
                role=role,
                content=content,
                context_used=context_used,
                sources=sources
            )
            
            db.add(message)
            
            # Update session last_message_at
            result = await db.execute(
                select(ChatSession).where(ChatSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session:
                session.last_message_at = datetime.utcnow()
            
            await db.commit()
            await db.refresh(message)
            
            return message
            
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            await db.rollback()
            raise
    
    async def get_session_messages(
        self,
        db: AsyncSession,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[ChatMessage]:
        """Get all messages in a session"""
        query = select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at)
        
        if limit:
            query = query.limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_judgment_context(
        self,
        db: AsyncSession,
        judgment_id: str
    ) -> str:
        """
        Get judgment context for chat
        
        Args:
            db: Database session
            judgment_id: Judgment ID
        
        Returns:
            Formatted context string
        """
        try:
            # Get judgment
            result = await db.execute(
                select(Judgment).where(Judgment.id == judgment_id)
            )
            judgment = result.scalar_one_or_none()
            
            if not judgment:
                return ""
            
            # Get directives
            result = await db.execute(
                select(Directive).where(Directive.judgment_id == judgment_id)
            )
            directives = result.scalars().all()
            
            # Format context
            context = f"""JUDGMENT INFORMATION:
Case ID: {judgment.case_id}
Court: {judgment.court_name}
Judge: {judgment.judge_name or 'N/A'}
Date: {judgment.judgment_date or 'N/A'}
Status: {judgment.status.value}

SUMMARY:
{judgment.summary or 'No summary available'}

EXTRACTED DIRECTIVES ({len(directives)} total):
"""
            
            for i, directive in enumerate(directives[:10], 1):  # Limit to 10 for context
                context += f"""
{i}. {directive.directive_text}
   - Type: {directive.directive_type.value}
   - Priority: {directive.priority.value}
   - Department: {directive.assigned_department or 'Not assigned'}
   - Deadline: {directive.deadline_text or 'Not specified'}
   - Status: {directive.verification_status.value}
"""
            
            if len(directives) > 10:
                context += f"\n... and {len(directives) - 10} more directives"
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting judgment context: {e}")
            return ""
    
    async def chat(
        self,
        db: AsyncSession,
        session_id: str,
        user_message: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Process a chat message and get AI response
        
        Args:
            db: Database session
            session_id: Chat session ID
            user_message: User's message
            user_id: User ID
        
        Returns:
            Response with message and metadata
        """
        try:
            # Get session
            session = await self.get_session(db, session_id)
            if not session:
                raise ValueError(f"Session not found: {session_id}")
            
            # Verify user owns session
            if session.user_id != user_id:
                raise ValueError("Unauthorized access to session")
            
            # Add user message
            await self.add_message(db, session_id, "user", user_message)
            
            # Get conversation history
            messages = await self.get_session_messages(db, session_id, limit=10)
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in messages[:-1]  # Exclude the just-added user message
            ]
            
            # Get context if judgment-specific
            context = ""
            sources = []
            
            if session.judgment_id:
                context = await self.get_judgment_context(db, session.judgment_id)
                sources.append({
                    "type": "judgment",
                    "judgment_id": session.judgment_id
                })
            
            # Get AI response
            ai_response = await llm_service.answer_question(
                question=user_message,
                context=context,
                conversation_history=conversation_history
            )
            
            # Add AI response
            ai_message = await self.add_message(
                db,
                session_id,
                "assistant",
                ai_response,
                context_used={"judgment_id": session.judgment_id} if session.judgment_id else None,
                sources=sources if sources else None
            )
            
            logger.info(f"Chat response generated for session {session_id}")
            
            return {
                "message_id": ai_message.id,
                "content": ai_response,
                "sources": sources,
                "timestamp": ai_message.created_at
            }
            
        except Exception as e:
            logger.error(f"Error in chat: {e}")
            raise
    
    async def chat_with_rag(
        self,
        db: AsyncSession,
        session_id: str,
        user_message: str,
        user_id: str,
        use_rag: bool = True
    ) -> Dict[str, Any]:
        """
        Process a chat message with lightweight context retrieval
        Uses SQL queries instead of embeddings (0MB vs 350MB memory)
        
        Args:
            db: Database session
            session_id: Chat session ID
            user_message: User's message
            user_id: User ID
            use_rag: Whether to use context retrieval
        
        Returns:
            Response with message and metadata
        """
        try:
            # Get session
            session = await self.get_session(db, session_id)
            if not session:
                raise ValueError(f"Session not found: {session_id}")
            
            # Verify user owns session
            if session.user_id != user_id:
                raise ValueError("Unauthorized access to session")
            
            # Add user message
            await self.add_message(db, session_id, "user", user_message)
            
            # Get conversation history
            messages = await self.get_session_messages(db, session_id, limit=10)
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in messages[:-1]  # Exclude the just-added user message
            ]
            
            # Get context using lightweight SQL-based retrieval
            context = ""
            sources = []
            context_items = []
            
            if use_rag:
                try:
                    # Use SQL-based search with timeout protection (fast, no memory overhead)
                    search_task = lightweight_context_retriever.search_judgments(
                        db, user_message, limit=3
                    )
                    context_items = await asyncio.wait_for(search_task, timeout=2.0)
                    
                    # Also search directives if query seems directive-related
                    if any(word in user_message.lower() for word in ['directive', 'action', 'department', 'deadline', 'priority']):
                        directive_task = lightweight_context_retriever.search_directives(
                            db, user_message, limit=3
                        )
                        directive_items = await asyncio.wait_for(directive_task, timeout=2.0)
                        context_items.extend(directive_items)
                    
                    if context_items:
                        context = lightweight_context_retriever.format_context_for_llm(context_items)
                        sources = [
                            {
                                "type": item.get("type"),
                                "id": item.get("judgment_id") or item.get("directive_id"),
                                "case_id": item.get("case_id")
                            }
                            for item in context_items
                        ]
                        logger.info(f"Retrieved {len(context_items)} context items using SQL search")
                    
                except asyncio.TimeoutError:
                    logger.warning("Context search timed out, proceeding without context")
                    context_items = []
                except Exception as search_error:
                    logger.error(f"Context search error: {search_error}, proceeding without context")
                    context_items = []
            
            # Fallback to judgment-specific context if no search results
            if not context and session.judgment_id:
                context = await self.get_judgment_context(db, session.judgment_id)
                sources.append({
                    "type": "judgment",
                    "judgment_id": session.judgment_id
                })
            
            # Build enhanced prompt with context
            if context:
                enhanced_prompt = f"""Based on the following context from court judgments and directives, please answer the user's question.

CONTEXT:
{context}

USER QUESTION:
{user_message}

Please provide a helpful, accurate answer based on the context provided. If the context doesn't contain relevant information, say so clearly."""
            else:
                enhanced_prompt = user_message
            
            # Get AI response
            ai_response = await llm_service.answer_question(
                question=enhanced_prompt,
                context="",  # Context already in prompt
                conversation_history=conversation_history
            )
            
            # Add AI response
            ai_message = await self.add_message(
                db,
                session_id,
                "assistant",
                ai_response,
                context_used={
                    "search_method": "sql",
                    "context_items_count": len(context_items),
                    "judgment_id": session.judgment_id
                },
                sources=sources if sources else None
            )
            
            logger.info(f"Chat response generated for session {session_id} using lightweight context")
            
            return {
                "message_id": ai_message.id,
                "content": ai_response,
                "sources": sources,
                "context_used": len(context_items),
                "timestamp": ai_message.created_at
            }
            
        except Exception as e:
            logger.error(f"Error in chat: {e}")
            raise
    
    async def summarize_judgment_chat(
        self,
        db: AsyncSession,
        judgment_id: str,
        user_id: str
    ) -> str:
        """
        Generate a summary of a judgment for chat context
        
        Args:
            db: Database session
            judgment_id: Judgment ID
            user_id: User ID
        
        Returns:
            Summary text
        """
        try:
            # Get judgment
            result = await db.execute(
                select(Judgment).where(Judgment.id == judgment_id)
            )
            judgment = result.scalar_one_or_none()
            
            if not judgment:
                raise ValueError(f"Judgment not found: {judgment_id}")
            
            # Generate summary using LLM
            case_info = {
                "case_id": judgment.case_id,
                "court_name": judgment.court_name,
                "judgment_date": judgment.judgment_date.isoformat() if judgment.judgment_date else None
            }
            
            summary = await llm_service.summarize_judgment(
                judgment.raw_text or "",
                case_info
            )
            
            # Update judgment summary if not exists
            if not judgment.summary:
                judgment.summary = summary
                await db.commit()
            
            return summary
            
        except Exception as e:
            logger.error(f"Error summarizing judgment: {e}")
            raise
    
    async def provide_feedback(
        self,
        db: AsyncSession,
        message_id: str,
        helpful: bool,
        notes: Optional[str] = None
    ) -> ChatMessage:
        """
        Provide feedback on a chat message
        
        Args:
            db: Database session
            message_id: Message ID
            helpful: Whether the message was helpful
            notes: Optional feedback notes
        
        Returns:
            Updated ChatMessage
        """
        try:
            result = await db.execute(
                select(ChatMessage).where(ChatMessage.id == message_id)
            )
            message = result.scalar_one_or_none()
            
            if not message:
                raise ValueError(f"Message not found: {message_id}")
            
            message.helpful = helpful
            message.feedback_notes = notes
            
            await db.commit()
            await db.refresh(message)
            
            logger.info(f"Feedback recorded for message {message_id}: helpful={helpful}")
            return message
            
        except Exception as e:
            logger.error(f"Error providing feedback: {e}")
            await db.rollback()
            raise
    
    async def close_session(
        self,
        db: AsyncSession,
        session_id: str
    ) -> ChatSession:
        """Close a chat session"""
        try:
            result = await db.execute(
                select(ChatSession).where(ChatSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            
            if not session:
                raise ValueError(f"Session not found: {session_id}")
            
            session.is_active = False
            await db.commit()
            await db.refresh(session)
            
            return session
            
        except Exception as e:
            logger.error(f"Error closing session: {e}")
            await db.rollback()
            raise


# Singleton instance
chat_service = ChatService()
