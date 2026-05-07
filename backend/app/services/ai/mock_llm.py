"""
Mock LLM Service for Demo/Testing
Provides instant responses without external API calls
"""
from typing import List, Dict, Any
import random
from datetime import datetime, timedelta


class MockLLMService:
    """Mock LLM service that returns predefined responses"""
    
    async def extract_directives(self, text: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract mock directives for demo purposes
        Returns realistic-looking directives instantly
        """
        # Generate 2-4 mock directives
        num_directives = random.randint(2, 4)
        
        mock_directives = [
            {
                "directive_text": "The respondent shall pay compensation of Rs. 50,000 to the petitioner within 30 days from the date of this order.",
                "directive_type": "monetary",
                "priority": "high",
                "confidence_score": 0.95,
                "action_required": "Payment of compensation amount",
                "responsible_entity": "Respondent",
                "deadline_text": "within 30 days",
                "source_page_number": 5,
                "source_text_highlight": "pay compensation of Rs. 50,000"
            },
            {
                "directive_text": "The concerned department shall file a detailed compliance report within 60 days.",
                "directive_type": "compliance",
                "priority": "medium",
                "confidence_score": 0.88,
                "action_required": "File compliance report with details",
                "responsible_entity": "Concerned Department",
                "deadline_text": "within 60 days",
                "source_page_number": 7,
                "source_text_highlight": "file a detailed compliance report"
            },
            {
                "directive_text": "The petitioner is directed to submit all relevant documents to the court registry within 15 days.",
                "directive_type": "procedural",
                "priority": "high",
                "confidence_score": 0.92,
                "action_required": "Submit documents to court registry",
                "responsible_entity": "Petitioner",
                "deadline_text": "within 15 days",
                "source_page_number": 8,
                "source_text_highlight": "submit all relevant documents"
            },
            {
                "directive_text": "The authorities are directed to ensure compliance with environmental norms within 90 days.",
                "directive_type": "regulatory",
                "priority": "medium",
                "confidence_score": 0.85,
                "action_required": "Ensure environmental compliance",
                "responsible_entity": "Environmental Authority",
                "deadline_text": "within 90 days",
                "source_page_number": 10,
                "source_text_highlight": "ensure compliance with environmental norms"
            },
            {
                "directive_text": "The case is adjourned to next hearing date for further proceedings.",
                "directive_type": "procedural",
                "priority": "low",
                "confidence_score": 0.78,
                "action_required": "Attend next hearing",
                "responsible_entity": "All Parties",
                "deadline_text": "next hearing date",
                "source_page_number": 12,
                "source_text_highlight": "adjourned to next hearing"
            }
        ]
        
        # Return random subset
        return random.sample(mock_directives, num_directives)
    
    async def assign_department(self, directive: Dict[str, Any], department_mapping: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assign mock department based on directive type
        """
        # Map directive types to departments
        type_to_dept = {
            "monetary": "Finance Department",
            "compliance": "Legal Department",
            "procedural": "Administration",
            "regulatory": "Environment Department",
            "enforcement": "Home Department"
        }
        
        directive_type = directive.get("directive_type", "procedural")
        assigned_dept = type_to_dept.get(directive_type, "Administration")
        
        return {
            "assigned_department": assigned_dept,
            "confidence_score": random.uniform(0.80, 0.95),
            "reasoning": f"Assigned to {assigned_dept} based on directive type: {directive_type}"
        }
    
    async def answer_question(
        self,
        question: str,
        context: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Generate mock answer for chat queries
        """
        mock_responses = [
            "Based on the judgment, the key directive is to ensure compliance within the specified timeline.",
            "The court has directed the concerned authorities to take immediate action on this matter.",
            "According to the judgment, the petitioner's request has been partially granted with specific conditions.",
            "The respondent is required to submit a detailed report addressing all the points raised in the petition.",
            "The court has emphasized the importance of timely compliance with all regulatory requirements."
        ]
        
        return random.choice(mock_responses)
    
    async def summarize_judgment(self, text: str, max_length: int = 500) -> str:
        """
        Generate mock summary
        """
        return """
        This judgment addresses the petition filed regarding compliance with regulatory requirements. 
        The court has directed the respondent to pay compensation and file a compliance report within 
        the specified timeline. The authorities are instructed to ensure proper implementation of 
        environmental norms. The case has been adjourned for further proceedings pending submission 
        of required documents.
        """
    
    async def extract_case_info(self, text: str) -> Dict[str, Any]:
        """
        Extract mock case information
        """
        return {
            "case_id": f"WP/{random.randint(1000, 9999)}/{datetime.now().year}",
            "court_name": "High Court",
            "petitioner": "ABC Corporation",
            "respondent": "State Government",
            "judgment_date": datetime.now().strftime("%Y-%m-%d")
        }


# Create singleton instance
mock_llm_service = MockLLMService()
