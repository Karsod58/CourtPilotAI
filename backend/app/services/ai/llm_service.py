"""
LLM Service for AI processing
Handles interactions with Ollama, OpenAI, and Anthropic APIs
"""
from typing import List, Dict, Any, Optional
from loguru import logger
import json
import asyncio

from app.core.config import settings

# Import mock LLM for fallback
from app.services.ai.mock_llm import mock_llm_service

# Try to import native Ollama client (preferred for cloud API)
try:
    from ollama import Client as OllamaClient
    OLLAMA_CLIENT_AVAILABLE = True
except ImportError:
    logger.warning("Ollama client not available")
    OLLAMA_CLIENT_AVAILABLE = False
    OllamaClient = None

# Try to import LangChain components, make them optional
try:
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI/LangChain not available")
    OPENAI_AVAILABLE = False
    ChatOpenAI = None
    OpenAIEmbeddings = None

try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    logger.warning("Anthropic not available")
    ANTHROPIC_AVAILABLE = False
    ChatAnthropic = None

try:
    from langchain_community.chat_models import ChatOllama
    OLLAMA_LANGCHAIN_AVAILABLE = True
except ImportError:
    logger.warning("Ollama/LangChain Community not available")
    OLLAMA_LANGCHAIN_AVAILABLE = False
    ChatOllama = None

try:
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    logger.warning("LangChain core not available")
    LANGCHAIN_AVAILABLE = False
    HumanMessage = SystemMessage = AIMessage = None


class LLMService:
    """Service for LLM operations with multi-provider fallback support"""
    
    def __init__(self):
        """Initialize LLM service with fallback chain: Primary → Ollama → Mock"""
        self.provider = settings.LLM_PROVIDER
        self.model_name = settings.LLM_MODEL
        self.llm = None
        self.ollama_client = None
        self.ollama_fallback = None
        self.embeddings = None
        self.use_native_ollama = False
        self.has_ollama_fallback = False
        
        try:
            # Initialize primary LLM based on provider
            if self.provider == "ollama":
                self._init_ollama_primary()
                
            elif self.provider == "openai":
                self._init_openai_primary()
                
            elif self.provider == "anthropic":
                self._init_anthropic_primary()
                
            elif self.provider == "mock":
                logger.info("Using mock LLM provider (no real AI)")
                self.llm = None
            else:
                raise ValueError(f"Unsupported LLM provider: {self.provider}")
            
            # Always try to initialize Ollama as fallback (if not primary)
            if self.provider != "ollama":
                self._init_ollama_fallback()
                
        except Exception as e:
            logger.error(f"Failed to initialize LLM service: {e}")
            # Try Ollama fallback
            self._init_ollama_fallback()
            if not self.has_ollama_fallback:
                logger.warning("No LLM available, will use mock service")
                self.llm = None
                self.ollama_client = None
    
    def _init_openai_primary(self):
        """Initialize OpenAI/Groq as primary provider"""
        if not OPENAI_AVAILABLE:
            logger.error("OpenAI not available")
            return
        
        try:
            # Check if using Groq (has custom base URL)
            base_url = getattr(settings, 'OPENAI_BASE_URL', None)
            provider_name = "Groq" if base_url and "groq.com" in base_url else "OpenAI"
            
            openai_config = {
                "model": self.model_name,
                "temperature": 0.1,
                "api_key": settings.OPENAI_API_KEY
            }
            
            if base_url:
                openai_config["base_url"] = base_url
            
            self.llm = ChatOpenAI(**openai_config)
            
            # Initialize embeddings
            try:
                if settings.OPENAI_API_KEY:
                    embedding_config = {
                        "model": settings.EMBEDDING_MODEL,
                        "api_key": settings.OPENAI_API_KEY
                    }
                    if base_url and "groq.com" not in base_url:  # Groq doesn't support embeddings
                        embedding_config["base_url"] = base_url
                    self.embeddings = OpenAIEmbeddings(**embedding_config)
            except Exception as e:
                logger.warning(f"Embeddings initialization failed: {e}")
                self.embeddings = None
            
            logger.info(f"✓ Initialized {provider_name} LLM: {self.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI/Groq: {e}")
            raise
    
    def _init_ollama_primary(self):
        """Initialize Ollama as primary provider"""
        # Use native Ollama client for cloud API (preferred)
        if OLLAMA_CLIENT_AVAILABLE:
            try:
                self.ollama_client = OllamaClient(
                    host=settings.OLLAMA_BASE_URL,
                    headers={'Authorization': f'Bearer {settings.OLLAMA_API_KEY}'} if settings.OLLAMA_API_KEY else {}
                )
                self.use_native_ollama = True
                logger.info(f"✓ Initialized Ollama client: {settings.OLLAMA_MODEL} at {settings.OLLAMA_BASE_URL}")
                return
            except Exception as e:
                logger.warning(f"Native Ollama client failed: {e}")
        
        # Fallback to LangChain if native client not available
        if OLLAMA_LANGCHAIN_AVAILABLE and LANGCHAIN_AVAILABLE:
            try:
                ollama_config = {
                    "base_url": settings.OLLAMA_BASE_URL,
                    "model": settings.OLLAMA_MODEL,
                    "temperature": 0.1,
                }
                
                if settings.OLLAMA_API_KEY:
                    ollama_config["headers"] = {
                        "Authorization": f"Bearer {settings.OLLAMA_API_KEY}"
                    }
                
                self.llm = ChatOllama(**ollama_config)
                logger.info(f"✓ Initialized Ollama LLM via LangChain: {settings.OLLAMA_MODEL} at {settings.OLLAMA_BASE_URL}")
            except Exception as e:
                logger.error(f"Ollama LangChain initialization failed: {e}")
                raise
        else:
            logger.error("Neither Ollama client nor LangChain available")
            raise ValueError("Ollama dependencies not available")
    
    def _init_anthropic_primary(self):
        """Initialize Anthropic as primary provider"""
        if not ANTHROPIC_AVAILABLE:
            logger.error("Anthropic not available")
            raise ValueError("Anthropic dependencies not available")
        
        try:
            self.llm = ChatAnthropic(
                model=self.model_name,
                temperature=0.1,
                api_key=settings.ANTHROPIC_API_KEY
            )
            
            # Anthropic doesn't have embeddings, use OpenAI for embeddings
            if OPENAI_AVAILABLE and settings.OPENAI_API_KEY:
                try:
                    self.embeddings = OpenAIEmbeddings(
                        model=settings.EMBEDDING_MODEL,
                        api_key=settings.OPENAI_API_KEY
                    )
                except Exception as e:
                    logger.warning(f"Embeddings initialization failed: {e}")
                    self.embeddings = None
            else:
                self.embeddings = None
            
            logger.info(f"✓ Initialized Anthropic LLM: {self.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic: {e}")
            raise
    
    def _init_ollama_fallback(self):
        """Initialize Ollama as fallback provider"""
        try:
            # Only initialize if we have Ollama settings
            ollama_url = getattr(settings, 'OLLAMA_FALLBACK_URL', None) or "http://localhost:11434"
            ollama_model = getattr(settings, 'OLLAMA_FALLBACK_MODEL', None) or "llama3.1:8b"
            
            if OLLAMA_LANGCHAIN_AVAILABLE and LANGCHAIN_AVAILABLE:
                ollama_config = {
                    "base_url": ollama_url,
                    "model": ollama_model,
                    "temperature": 0.1,
                }
                
                self.ollama_fallback = ChatOllama(**ollama_config)
                self.has_ollama_fallback = True
                logger.info(f"✓ Initialized Ollama fallback: {ollama_model} at {ollama_url}")
        except Exception as e:
            logger.warning(f"Ollama fallback initialization failed: {e}")
            self.has_ollama_fallback = False
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        General chat interface with fallback chain: Primary → Ollama → Mock
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: Optional system prompt
        
        Returns:
            AI response text
        """
        # Try primary provider
        try:
            return await self._chat_with_provider(messages, system_prompt, use_fallback=False)
        except Exception as e:
            logger.warning(f"Primary provider failed: {e}")
            
            # Try Ollama fallback
            if self.has_ollama_fallback:
                try:
                    logger.info("Trying Ollama fallback...")
                    return await self._chat_with_provider(messages, system_prompt, use_fallback=True)
                except Exception as e2:
                    logger.warning(f"Ollama fallback failed: {e2}")
            
            # Final fallback to mock
            logger.warning("All providers failed, using mock response")
            return await mock_llm_service.answer_question(
                question=messages[-1].get('content', ''),
                context="",
                conversation_history=messages[:-1] if len(messages) > 1 else None
            )
    
    async def _chat_with_provider(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        use_fallback: bool = False
    ) -> str:
        """
        Chat with specific provider (primary or fallback)
        
        Args:
            messages: List of message dicts
            system_prompt: Optional system prompt
            use_fallback: If True, use Ollama fallback instead of primary
        
        Returns:
            AI response text
        """
        # Use Ollama fallback if requested
        if use_fallback:
            if not self.has_ollama_fallback:
                raise ValueError("Ollama fallback not available")
            llm_to_use = self.ollama_fallback
        else:
            # Use native Ollama client if available
            if self.use_native_ollama and self.ollama_client:
                return await self._chat_native_ollama(messages, system_prompt)
            
            if not self.llm:
                raise ValueError("Primary LLM not initialized")
            
            llm_to_use = self.llm
        
        # Use LangChain for all other providers
        if not LANGCHAIN_AVAILABLE:
            raise ValueError("LangChain not available")
        
        # Convert messages to LangChain format
        lc_messages = []
        
        if system_prompt:
            lc_messages.append(SystemMessage(content=system_prompt))
        
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            if role == 'system':
                lc_messages.append(SystemMessage(content=content))
            elif role == 'assistant' or role == 'ai':
                lc_messages.append(AIMessage(content=content))
            else:  # user
                lc_messages.append(HumanMessage(content=content))
        
        response = await llm_to_use.ainvoke(lc_messages)
        return response.content
    
    async def _chat_native_ollama(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Chat using native Ollama client
        
        Args:
            messages: List of message dicts
            system_prompt: Optional system prompt
        
        Returns:
            AI response text
        """
        # Build messages for Ollama
        ollama_messages = []
        
        if system_prompt:
            ollama_messages.append({
                'role': 'system',
                'content': system_prompt
            })
        
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # Normalize role names
            if role == 'ai':
                role = 'assistant'
            
            ollama_messages.append({
                'role': role,
                'content': content
            })
        
        # Call Ollama API
        response = self.ollama_client.chat(
            model=settings.OLLAMA_MODEL,
            messages=ollama_messages
        )
        
        return response['message']['content']
    
    def _chunk_text(self, text: str, max_chars: int = 25000) -> List[str]:
        """
        Split text into chunks that fit within LLM context window
        
        Args:
            text: Text to chunk
            max_chars: Maximum characters per chunk (roughly 6000 tokens)
        
        Returns:
            List of text chunks
        """
        # Try to split on page boundaries first
        pages = text.split("--- Page")
        chunks = []
        current_chunk = ""
        
        for page in pages:
            if len(current_chunk) + len(page) < max_chars:
                current_chunk += "--- Page" + page if current_chunk else page
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = "--- Page" + page if page.strip() else page
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks if chunks else [text]
    
    async def _extract_directives_from_chunk(self, text: str, case_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract directives from a text chunk
        
        Args:
            text: Text chunk to analyze
            case_context: Context about the case
        
        Returns:
            List of extracted directives
        """
        system_prompt = """You are a legal AI assistant specialized in analyzing Indian court judgments.
Your task is to extract ALL actionable directives, orders, and mandates from the judgment text.

For each directive, identify:
1. The exact directive text (verbatim from judgment)
2. Type of directive (mandatory/advisory/conditional/immediate/periodic)
3. Priority level (critical/high/medium/low)
4. Action required (what needs to be done)
5. Responsible entity (who should do it - government department, ministry, etc.)
6. Deadline (if mentioned, extract the exact date or timeframe)
7. Source location (page number, paragraph if available)

Be thorough and extract even implicit directives. Consider:
- Direct orders ("The respondent shall...")
- Compliance requirements ("It is directed that...")
- Reporting requirements ("Submit a report within...")
- Monetary obligations ("Pay compensation of...")
- Policy changes ("The government must formulate...")

Return your response as a JSON array of directives. If no directives found, return empty array []."""

        user_prompt = f"""Analyze this court judgment excerpt and extract all directives:

Case ID: {case_context.get('case_id', 'N/A')}
Court: {case_context.get('court_name', 'N/A')}
Date: {case_context.get('judgment_date', 'N/A')}

JUDGMENT TEXT:
{text}

Extract all directives in JSON format with the following structure:
[
  {{
    "directive_text": "exact text from judgment",
    "directive_type": "mandatory|advisory|conditional|immediate|periodic",
    "priority": "critical|high|medium|low",
    "confidence_score": 0.0-1.0,
    "action_required": "description of action",
    "responsible_entity": "department/ministry/entity name",
    "deadline": "YYYY-MM-DD or null",
    "deadline_text": "original deadline text from judgment",
    "source_page_number": page number or null,
    "source_text_highlight": "surrounding context from judgment"
  }}
]"""

        try:
            messages = [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ]
            
            response = await self.chat(messages)
            
            # Parse JSON response
            content = response
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Handle empty responses
            if not content or content.strip() == "":
                return []
            
            directives = json.loads(content)
            
            return directives if isinstance(directives, list) else []
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON from LLM response: {e}")
            return []
        except Exception as e:
            logger.error(f"Error extracting directives from chunk: {e}")
            return []
    
    async def extract_directives(self, text: str, case_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract directives from judgment text using LLM with fallback chain
        Fallback order: Primary (Groq/OpenAI) → Ollama → Mock
        
        Args:
            text: Full judgment text
            case_context: Context about the case (case_id, court, etc.)
        
        Returns:
            List of extracted directives with metadata
        """
        try:
            logger.info(f"Extracting directives from text of length {len(text)}")
            
            # Use mock service if configured
            if settings.LLM_PROVIDER == "mock":
                logger.info("Using mock LLM service for directive extraction")
                return await mock_llm_service.extract_directives(text, case_context)
            
            # Try primary provider with timeout
            try:
                logger.info(f"Trying primary provider ({self.provider})...")
                result = await asyncio.wait_for(
                    self._extract_directives_real(text, case_context),
                    timeout=30.0
                )
                logger.info(f"✓ Primary provider succeeded: extracted {len(result)} directives")
                return result
            except asyncio.TimeoutError:
                logger.warning(f"Primary provider timed out after 30s")
            except Exception as e:
                logger.warning(f"Primary provider failed: {e}")
            
            # Try Ollama fallback
            if self.has_ollama_fallback:
                try:
                    logger.info("Trying Ollama fallback...")
                    result = await asyncio.wait_for(
                        self._extract_directives_with_ollama_fallback(text, case_context),
                        timeout=45.0
                    )
                    logger.info(f"✓ Ollama fallback succeeded: extracted {len(result)} directives")
                    return result
                except asyncio.TimeoutError:
                    logger.warning("Ollama fallback timed out after 45s")
                except Exception as e:
                    logger.warning(f"Ollama fallback failed: {e}")
            
            # Final fallback to mock
            logger.warning("All AI providers failed, falling back to mock")
            return await mock_llm_service.extract_directives(text, case_context)
            
        except Exception as e:
            logger.error(f"Error extracting directives: {e}")
            # Final fallback to mock
            return await mock_llm_service.extract_directives(text, case_context)
    
    async def _extract_directives_with_ollama_fallback(self, text: str, case_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract directives using Ollama fallback
        """
        # Temporarily swap to use fallback
        original_llm = self.llm
        self.llm = self.ollama_fallback
        
        try:
            result = await self._extract_directives_real(text, case_context)
            return result
        finally:
            # Restore original LLM
            self.llm = original_llm
    
    async def _extract_directives_real(self, text: str, case_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Real LLM extraction (original logic)
        """
        # If text is small enough, process directly
        if len(text) <= 25000:
            logger.info("Text fits in single chunk, processing directly")
            return await self._extract_directives_from_chunk(text, case_context)
        
        # Otherwise, chunk the text
        logger.info("Text too large, chunking for processing")
        chunks = self._chunk_text(text, max_chars=25000)
        logger.info(f"Split text into {len(chunks)} chunks")
        
        all_directives = []
        for i, chunk in enumerate(chunks, 1):
            logger.info(f"Processing chunk {i}/{len(chunks)} ({len(chunk)} chars)")
            try:
                directives = await self._extract_directives_from_chunk(chunk, case_context)
                all_directives.extend(directives)
                logger.info(f"Extracted {len(directives)} directives from chunk {i}")
            except Exception as e:
                logger.error(f"Error processing chunk {i}: {e}")
                # Continue with other chunks
                continue
        
        logger.info(f"Total directives extracted: {len(all_directives)}")
        return all_directives
    
    async def assign_department(self, directive: Dict[str, Any], department_mapping: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assign responsible department to a directive using LLM with fallback chain
        Fallback order: Primary (Groq/OpenAI) → Ollama → Mock
        
        Args:
            directive: Directive information
            department_mapping: Available departments and their responsibilities
        
        Returns:
            Department assignment with confidence score
        """
        try:
            logger.info(f"Assigning department for directive")
            
            # Use mock service if configured
            if settings.LLM_PROVIDER == "mock":
                logger.info("Using mock LLM service for department assignment")
                return await mock_llm_service.assign_department(directive, department_mapping)
            
            # Try primary provider with timeout
            try:
                logger.info(f"Trying primary provider ({self.provider})...")
                result = await asyncio.wait_for(
                    self._assign_department_real(directive, department_mapping),
                    timeout=20.0
                )
                logger.info(f"✓ Primary provider succeeded")
                return result
            except asyncio.TimeoutError:
                logger.warning("Primary provider timed out after 20s")
            except Exception as e:
                logger.warning(f"Primary provider failed: {e}")
            
            # Try Ollama fallback
            if self.has_ollama_fallback:
                try:
                    logger.info("Trying Ollama fallback...")
                    result = await asyncio.wait_for(
                        self._assign_department_with_ollama_fallback(directive, department_mapping),
                        timeout=30.0
                    )
                    logger.info(f"✓ Ollama fallback succeeded")
                    return result
                except asyncio.TimeoutError:
                    logger.warning("Ollama fallback timed out after 30s")
                except Exception as e:
                    logger.warning(f"Ollama fallback failed: {e}")
            
            # Final fallback to mock
            logger.warning("All AI providers failed, falling back to mock")
            return await mock_llm_service.assign_department(directive, department_mapping)
            
        except Exception as e:
            logger.error(f"Error assigning department: {e}")
            # Final fallback to mock
            return await mock_llm_service.assign_department(directive, department_mapping)
    
    async def _assign_department_with_ollama_fallback(self, directive: Dict[str, Any], department_mapping: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assign department using Ollama fallback
        """
        # Temporarily swap to use fallback
        original_llm = self.llm
        self.llm = self.ollama_fallback
        
        try:
            result = await self._assign_department_real(directive, department_mapping)
            return result
        finally:
            # Restore original LLM
            self.llm = original_llm
    
    async def _assign_department_real(self, directive: Dict[str, Any], department_mapping: Dict[str, Any]) -> Dict[str, Any]:
        """
        Real LLM department assignment (original logic)
        """
        system_prompt = """You are an expert in Indian government structure and department responsibilities.
Your task is to assign the most appropriate government department to handle a court directive.

Consider:
- Department jurisdiction and responsibilities
- Subject matter of the directive
- Historical precedents
- Administrative hierarchy

Provide your response as JSON with department name and confidence score (0.0-1.0)."""

        departments_list = "\n".join([
            f"- {dept['name']}: {dept['description']}"
            for dept in department_mapping.get('departments', [])
        ])

        user_prompt = f"""Assign the appropriate department for this directive:

DIRECTIVE:
{directive.get('directive_text', '')}

ACTION REQUIRED:
{directive.get('action_required', '')}

RESPONSIBLE ENTITY MENTIONED:
{directive.get('responsible_entity', 'Not specified')}

AVAILABLE DEPARTMENTS:
{departments_list}

Return JSON:
{{
  "assigned_department": "department name",
  "confidence_score": 0.0-1.0,
  "reasoning": "brief explanation"
}}"""

        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        response = await self.chat(messages)
        content = response
        
        # Extract JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        assignment = json.loads(content)
        
        logger.info(f"Assigned department: {assignment.get('assigned_department')} with confidence {assignment.get('confidence_score')}")
        return assignment
    
    async def answer_question(
        self,
        question: str,
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Answer questions about judgments and documents
        Includes timeout and fallback to mock for demo
        
        Args:
            question: User's question
            context: Relevant context (judgment text, directives, etc.)
            conversation_history: Previous conversation messages
        
        Returns:
            Answer to the question
        """
        try:
            # Use mock service if configured or if LLM is not available
            if settings.LLM_PROVIDER == "mock" or not self.llm:
                logger.info("Using mock LLM service for question answering")
                return await mock_llm_service.answer_question(question, context, conversation_history)
            
            # Try real LLM with timeout
            try:
                result = await asyncio.wait_for(
                    self._answer_question_real(question, context, conversation_history),
                    timeout=30.0
                )
                return result
            except asyncio.TimeoutError:
                logger.warning("Question answering timed out after 30s, falling back to mock")
                return await mock_llm_service.answer_question(question, context, conversation_history)
            except Exception as e:
                logger.error(f"Question answering failed: {e}, falling back to mock")
                return await mock_llm_service.answer_question(question, context, conversation_history)
            
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            return "I apologize, but I'm unable to answer that question at the moment. Please try again later."
    
    async def _answer_question_real(
        self,
        question: str,
        context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Real LLM question answering (original logic)
        """
        system_prompt = """You are a helpful legal assistant for government officials working with court judgments.
Your role is to answer questions about court orders, directives, and compliance requirements.

Guidelines:
- Provide clear, accurate answers based on the provided context
- If information is not in the context, say so clearly
- Use simple language suitable for officials
- Cite specific parts of the judgment when relevant
- Be concise but complete
- If asked about deadlines, highlight them clearly
- If asked about responsibilities, identify the department/officer clearly"""

        # Build conversation
        messages = []
        
        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history[-5:]:  # Last 5 messages for context
                messages.append(msg)
        
        # Add current question with context
        user_message = f"""CONTEXT:
{context}

QUESTION:
{question}

Please answer the question based on the context provided."""

        messages.append({'role': 'user', 'content': user_message})
        
        response = await self.chat(messages, system_prompt)
        return response
    
    async def summarize_judgment(self, judgment_text: str, case_info: Dict[str, Any]) -> str:
        """
        Generate a concise summary of a judgment
        Includes timeout and fallback to mock for demo
        
        Args:
            judgment_text: Full judgment text
            case_info: Case metadata
        
        Returns:
            Summary text
        """
        try:
            # Use mock service if configured or if LLM is not available
            if settings.LLM_PROVIDER == "mock" or not self.llm:
                logger.info("Using mock LLM service for judgment summarization")
                return await mock_llm_service.summarize_judgment(judgment_text, 500)
            
            # Try real LLM with timeout
            try:
                result = await asyncio.wait_for(
                    self._summarize_judgment_real(judgment_text, case_info),
                    timeout=30.0
                )
                return result
            except asyncio.TimeoutError:
                logger.warning("Judgment summarization timed out after 30s, falling back to mock")
                return await mock_llm_service.summarize_judgment(judgment_text, 500)
            except Exception as e:
                logger.error(f"Judgment summarization failed: {e}, falling back to mock")
                return await mock_llm_service.summarize_judgment(judgment_text, 500)
            
        except Exception as e:
            logger.error(f"Error summarizing judgment: {e}")
            return "Unable to generate summary at this time."
    
    async def _summarize_judgment_real(self, judgment_text: str, case_info: Dict[str, Any]) -> str:
        """
        Real LLM judgment summarization (original logic)
        """
        system_prompt = """You are a legal expert creating concise summaries of court judgments for government officials.
Create a clear, structured summary that highlights:
1. Key facts of the case
2. Main legal issues
3. Court's decision
4. Important directives and orders
5. Deadlines and compliance requirements"""

        user_prompt = f"""Summarize this court judgment:

Case ID: {case_info.get('case_id', 'N/A')}
Court: {case_info.get('court_name', 'N/A')}
Date: {case_info.get('judgment_date', 'N/A')}

JUDGMENT:
{judgment_text[:5000]}...

Provide a structured summary in 200-300 words."""

        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        response = await self.chat(messages)
        return response
    
    async def generate_action_plan(self, directives: List[Dict[str, Any]], judgment_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive action plan from directives
        
        Args:
            directives: List of verified directives
            judgment_context: Context about the judgment
        
        Returns:
            Structured action plan
        """
        system_prompt = """You are a legal compliance expert creating actionable plans from court directives.
Generate a comprehensive, step-by-step action plan that ensures full compliance with all court orders.

The action plan should include:
1. Clear action items with specific tasks
2. Timeline and milestones
3. Responsible parties
4. Compliance checklist
5. Risk assessment
6. Resource requirements"""

        directives_text = "\n\n".join([
            f"Directive {i+1}:\n{d.get('directive_text', '')}\nAction: {d.get('action_required', '')}\nDeadline: {d.get('deadline_text', 'Not specified')}"
            for i, d in enumerate(directives)
        ])

        user_prompt = f"""Create an action plan for these court directives:

CASE: {judgment_context.get('case_id', 'N/A')}
COURT: {judgment_context.get('court_name', 'N/A')}

DIRECTIVES:
{directives_text}

Generate a JSON action plan:
{{
  "title": "Action Plan Title",
  "description": "Overall plan description",
  "action_items": [
    {{
      "task": "specific task",
      "responsible": "role/department",
      "deadline": "YYYY-MM-DD",
      "priority": "critical|high|medium|low",
      "dependencies": ["other task ids"]
    }}
  ],
  "compliance_checklist": [
    "checklist item 1",
    "checklist item 2"
  ],
  "risk_assessment": {{
    "compliance_risk_score": 1-10,
    "key_risks": ["risk 1", "risk 2"],
    "mitigation_strategies": ["strategy 1", "strategy 2"]
  }},
  "estimated_completion_date": "YYYY-MM-DD"
}}"""

        try:
            messages = [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ]
            
            response = await self.chat(messages)
            content = response
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            action_plan = json.loads(content)
            
            logger.info(f"Generated action plan with {len(action_plan.get('action_items', []))} items")
            return action_plan
            
        except Exception as e:
            logger.error(f"Error generating action plan: {e}")
            raise
    
    async def recommend_appeal(self, judgment_text: str, similar_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Recommend whether to appeal based on judgment and similar cases
        
        Args:
            judgment_text: Current judgment text
            similar_cases: List of similar past cases
        
        Returns:
            Appeal recommendation with reasoning
        """
        system_prompt = """You are a senior legal advisor analyzing court judgments for appeal recommendations.
Provide a data-driven recommendation on whether to file an appeal based on:
1. Merits of the current judgment
2. Success rates in similar cases
3. Legal precedents
4. Cost-benefit analysis
5. Probability of success

Be objective and provide clear reasoning."""

        similar_cases_text = "\n\n".join([
            f"Case {i+1}: {case.get('case_id', 'N/A')}\nOutcome: {case.get('outcome', 'N/A')}\nSimilarity: {case.get('similarity_score', 0):.2f}"
            for i, case in enumerate(similar_cases[:5])
        ])

        user_prompt = f"""Analyze this judgment and recommend on appeal:

CURRENT JUDGMENT (Summary):
{judgment_text[:2000]}...

SIMILAR PAST CASES:
{similar_cases_text}

Provide recommendation as JSON:
{{
  "appeal_recommended": "yes|no|maybe",
  "appeal_probability": 0-100,
  "confidence_score": 0.0-1.0,
  "reasoning": "detailed explanation",
  "key_factors": ["factor 1", "factor 2"],
  "success_probability": 0-100,
  "estimated_cost": "low|medium|high",
  "recommendation_summary": "brief summary"
}}"""

        try:
            messages = [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ]
            
            response = await self.chat(messages)
            content = response
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            recommendation = json.loads(content)
            
            logger.info(f"Appeal recommendation: {recommendation.get('appeal_recommended')} with {recommendation.get('appeal_probability')}% probability")
            return recommendation
            
        except Exception as e:
            logger.error(f"Error generating appeal recommendation: {e}")
            raise
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for texts
        
        Args:
            texts: List of texts to embed
        
        Returns:
            List of embedding vectors
        """
        if not self.embeddings:
            raise ValueError("Embeddings not configured - check dependencies and API keys")
        
        try:
            embeddings = await self.embeddings.aembed_documents(texts)
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
        
        Returns:
            Embedding vector
        """
        if not self.embeddings:
            raise ValueError("Embeddings not configured - check dependencies and API keys")
        
        try:
            embedding = await self.embeddings.aembed_query(text)
            return embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise


# Singleton instance
try:
    llm_service = LLMService()
    logger.info("LLM service initialized successfully")
except Exception as e:
    logger.error(f"Failed to create LLM service instance: {e}")
    llm_service = None
