"""
Minimal LLM Service for Railway deployment
Uses OpenAI client directly without LangChain to save memory
"""
from typing import List, Dict, Any, Optional
from loguru import logger
import json
import asyncio

from app.core.config import settings
from app.services.ai.mock_llm import mock_llm_service

# Try to import OpenAI client
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI client not available")
    OPENAI_AVAILABLE = False
    AsyncOpenAI = None


class LLMService:
    """Minimal LLM service using OpenAI client directly"""
    
    def __init__(self):
        """Initialize LLM service with Groq/OpenAI → Mock fallback"""
        self.provider = settings.LLM_PROVIDER
        self.model_name = settings.LLM_MODEL
        self.client = None
        self.fallback_client = None
        
        try:
            # Initialize primary client (Groq or OpenAI)
            if self.provider == "openai" and OPENAI_AVAILABLE:
                self.client = AsyncOpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    base_url=settings.OPENAI_BASE_URL if settings.OPENAI_BASE_URL else None
                )
                logger.info(f"Initialized OpenAI client with base_url: {settings.OPENAI_BASE_URL}")
                
            elif self.provider == "mock":
                logger.info("Using mock LLM provider (no real AI)")
                self.client = None
            else:
                logger.warning(f"Unsupported provider: {self.provider}, falling back to mock")
                self.client = None
                
            # Initialize fallback client if configured
            if hasattr(settings, 'OLLAMA_FALLBACK_URL') and settings.OLLAMA_FALLBACK_URL:
                try:
                    self.fallback_client = AsyncOpenAI(
                        api_key=settings.OPENAI_API_KEY or "dummy",
                        base_url=settings.OLLAMA_FALLBACK_URL
                    )
                    logger.info(f"Initialized fallback client: {settings.OLLAMA_FALLBACK_URL}")
                except Exception as e:
                    logger.warning(f"Could not initialize fallback client: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to initialize LLM service: {e}")
            self.client = None
    
    async def _call_with_fallback(self, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """Call LLM with automatic fallback to mock"""
        # Try primary client
        if self.client:
            try:
                response = await asyncio.wait_for(
                    self.client.chat.completions.create(
                        model=self.model_name,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens
                    ),
                    timeout=30.0
                )
                return response.choices[0].message.content
            except asyncio.TimeoutError:
                logger.warning("Primary LLM timeout, trying fallback")
            except Exception as e:
                logger.warning(f"Primary LLM error: {e}, trying fallback")
        
        # Try fallback client
        if self.fallback_client:
            try:
                fallback_model = getattr(settings, 'OLLAMA_FALLBACK_MODEL', 'llama3.1:8b')
                response = await asyncio.wait_for(
                    self.fallback_client.chat.completions.create(
                        model=fallback_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens
                    ),
                    timeout=30.0
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"Fallback LLM error: {e}, using mock")
        
        # Final fallback to mock
        logger.info("Using mock LLM response")
        return await self._mock_response(messages)
    
    async def _mock_response(self, messages: List[Dict]) -> str:
        """Generate mock response based on message content"""
        last_message = messages[-1]["content"].lower()
        
        if "extract" in last_message or "case" in last_message:
            return json.dumps({
                "case_id": "MOCK-2024-001",
                "court_name": "Mock High Court",
                "judge_name": "Hon'ble Justice Mock",
                "judgment_date": "2024-01-15",
                "petitioner": "Mock Petitioner",
                "respondent": "Mock Respondent"
            })
        elif "directive" in last_message or "action" in last_message:
            return json.dumps({
                "directives": [
                    {
                        "text": "Mock directive: Implement compliance measures within 30 days",
                        "department": "Legal",
                        "priority": "high",
                        "deadline_days": 30
                    },
                    {
                        "text": "Mock directive: Submit status report to court",
                        "department": "Administration",
                        "priority": "medium",
                        "deadline_days": 60
                    }
                ]
            })
        else:
            return "Mock LLM response for testing purposes"
    
    async def extract_case_details(self, text: str) -> Dict[str, Any]:
        """Extract case details from judgment text"""
        messages = [
            {
                "role": "system",
                "content": "You are a legal AI assistant. Extract case details from court judgments and return them in JSON format."
            },
            {
                "role": "user",
                "content": f"""Extract the following details from this court judgment:
- case_id (case number)
- court_name
- judge_name
- judgment_date (YYYY-MM-DD format)
- petitioner
- respondent

Return ONLY a JSON object with these fields. If a field is not found, use null.

Judgment text:
{text[:3000]}"""
            }
        ]
        
        try:
            response = await self._call_with_fallback(messages, temperature=0.3)
            # Try to parse JSON from response
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from LLM response: {response}")
            return {}
        except Exception as e:
            logger.error(f"Error extracting case details: {e}")
            return {}
    
    async def extract_directives(self, text: str, case_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract actionable directives from judgment"""
        messages = [
            {
                "role": "system",
                "content": "You are a legal AI assistant. Extract actionable directives from court judgments."
            },
            {
                "role": "user",
                "content": f"""Analyze this court judgment and extract all actionable directives/orders.

For each directive, provide:
- text: The exact directive text
- department: Responsible department (Legal/Administration/Finance/HR/IT/Operations)
- priority: high/medium/low
- deadline_days: Number of days to complete (estimate if not specified)

Return ONLY a JSON object with a "directives" array.

Case: {case_context.get('case_id', 'Unknown')}
Court: {case_context.get('court_name', 'Unknown')}

Judgment text:
{text[:4000]}"""
            }
        ]
        
        try:
            response = await self._call_with_fallback(messages, temperature=0.3, max_tokens=3000)
            # Try to parse JSON from response
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            data = json.loads(response)
            return data.get("directives", [])
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from LLM response: {response}")
            return []
        except Exception as e:
            logger.error(f"Error extracting directives: {e}")
            return []
    
    async def generate_action_plan(self, directive_text: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate action plan for a directive"""
        messages = [
            {
                "role": "system",
                "content": "You are a legal compliance assistant. Generate detailed action plans for court directives."
            },
            {
                "role": "user",
                "content": f"""Create an action plan for this court directive:

Directive: {directive_text}
Department: {context.get('department', 'Unknown')}
Priority: {context.get('priority', 'medium')}

Provide:
- steps: Array of action steps (each with description, responsible_role, estimated_days)
- resources_needed: Array of required resources
- risks: Array of potential risks
- success_criteria: Array of success metrics

Return ONLY a JSON object.

Directive text:
{directive_text}"""
            }
        ]
        
        try:
            response = await self._call_with_fallback(messages, temperature=0.5, max_tokens=2000)
            # Try to parse JSON from response
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from LLM response: {response}")
            return {
                "steps": [],
                "resources_needed": [],
                "risks": [],
                "success_criteria": []
            }
        except Exception as e:
            logger.error(f"Error generating action plan: {e}")
            return {
                "steps": [],
                "resources_needed": [],
                "risks": [],
                "success_criteria": []
            }
    
    async def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """General chat interface"""
        return await self._call_with_fallback(messages, temperature=temperature)
    
    async def answer_question(
        self,
        question: str,
        context: str = "",
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Answer a question with optional context and conversation history
        
        Args:
            question: User's question
            context: Optional context information
            conversation_history: Optional conversation history
            
        Returns:
            AI response
        """
        messages = [
            {
                "role": "system",
                "content": "You are CourtPilot AI, a helpful legal assistant for government officials. You help with court judgments, directives, compliance, and legal queries. Provide clear, accurate, and actionable responses."
            }
        ]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history[-5:])  # Last 5 messages for context
        
        # Add context if provided
        if context:
            messages.append({
                "role": "system",
                "content": f"Context information:\n{context}"
            })
        
        # Add user question
        messages.append({
            "role": "user",
            "content": question
        })
        
        return await self._call_with_fallback(messages, temperature=0.7, max_tokens=2000)
    
    async def summarize_judgment(
        self,
        judgment_text: str,
        case_info: Dict[str, Any]
    ) -> str:
        """
        Generate a summary of a judgment
        
        Args:
            judgment_text: Full judgment text
            case_info: Case information (case_id, court_name, etc.)
            
        Returns:
            Summary text
        """
        messages = [
            {
                "role": "system",
                "content": "You are a legal AI assistant. Summarize court judgments concisely, highlighting key facts, legal issues, decisions, and directives."
            },
            {
                "role": "user",
                "content": f"""Summarize this court judgment in 3-4 paragraphs:

Case: {case_info.get('case_id', 'Unknown')}
Court: {case_info.get('court_name', 'Unknown')}
Date: {case_info.get('judgment_date', 'Unknown')}

Include:
1. Key facts and parties involved
2. Main legal issues
3. Court's decision and reasoning
4. Important directives/orders

Judgment text:
{judgment_text[:5000]}"""
            }
        ]
        
        return await self._call_with_fallback(messages, temperature=0.5, max_tokens=1500)
    
    async def assign_department(
        self,
        directive_data: Dict[str, Any],
        department_mapping: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Assign department to a directive
        
        Args:
            directive_data: Directive information
            department_mapping: Available departments
            
        Returns:
            Assignment with department and confidence
        """
        directive_text = directive_data.get('text', directive_data.get('directive_text', ''))
        
        # Simple keyword-based assignment (fast, no LLM needed)
        department_keywords = {
            'Legal': ['legal', 'law', 'court', 'advocate', 'counsel', 'litigation'],
            'Finance': ['finance', 'payment', 'fund', 'budget', 'money', 'cost', 'salary', 'pension'],
            'HR': ['employee', 'staff', 'personnel', 'recruitment', 'appointment', 'promotion'],
            'Administration': ['admin', 'office', 'record', 'file', 'document', 'report'],
            'IT': ['computer', 'software', 'system', 'digital', 'online', 'website'],
            'Operations': ['operation', 'service', 'facility', 'maintenance', 'infrastructure']
        }
        
        text_lower = directive_text.lower()
        scores = {}
        
        for dept, keywords in department_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                scores[dept] = score
        
        # Get department with highest score
        if scores:
            assigned_dept = max(scores, key=scores.get)
            confidence = min(scores[assigned_dept] * 0.2, 0.9)  # Cap at 0.9
        else:
            assigned_dept = 'Administration'  # Default
            confidence = 0.5
        
        return {
            'department': assigned_dept,
            'confidence': confidence,
            'reasoning': f'Assigned based on keyword analysis'
        }


# Global instance
llm_service = LLMService()
