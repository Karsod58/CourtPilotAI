# Production Issues & Solutions

## Issue 1: AI Processing Hangs at 8%

### Problem
- PDF upload works
- Processing starts but hangs at 8%
- Auto-extraction doesn't complete
- No directives are extracted

### Root Cause
The backend is using **Ollama Cloud API** (`https://ollama.com`) which:
1. **Requires actual API calls** to external service
2. **Is slow** (can take 30+ seconds per request)
3. **May timeout** in production environment
4. **Requires API key** to work properly

### Current Configuration
```env
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=2ebce87874da4465951244e35e8d4007.5TmcrjYStknD5XLCQzowAUlq
OLLAMA_MODEL=gemma3:12b
```

### Solutions

#### Option 1: Use OpenAI API (Recommended for Production)
OpenAI API is faster and more reliable for production:

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Set in Railway environment variables:
   ```
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-your-key-here
   LLM_MODEL=gpt-3.5-turbo
   ```
3. Redeploy

**Pros**: Fast, reliable, good quality
**Cons**: Costs money (~$0.002 per request)

#### Option 2: Disable AI Processing for Demo
For demo purposes, you can disable AI and use mock data:

1. Set in Railway:
   ```
   LLM_PROVIDER=mock
   ```
2. The system will use pre-defined mock directives
3. Processing will complete instantly

**Pros**: Free, fast, works for demo
**Cons**: Not real AI extraction

#### Option 3: Self-Host Ollama (Best for Long-term)
Run Ollama on your own server:

1. Deploy Ollama on a separate server/container
2. Set `OLLAMA_BASE_URL` to your server URL
3. No API key needed

**Pros**: Free, private, full control
**Cons**: Requires additional infrastructure

---

## Issue 2: Frontend Environment Variables Not Working

### Problem
Frontend shows `POST //auth/login` instead of correct URL

### Solution
Set environment variables in **Vercel Dashboard** (not in `.env.production` file):

1. Go to https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add:
   ```
   VITE_API_URL=https://courtpilotai-production.up.railway.app/api/v1
   ```
4. Select "Production" environment
5. Redeploy

---

## Recommended Quick Fix for Demo

### Step 1: Add Mock LLM Provider

Create `backend/app/services/ai/mock_llm.py`:

```python
"""Mock LLM for demo/testing without external API"""
from typing import List, Dict, Any
import random

class MockLLMService:
    async def extract_directives(self, text: str, context: Dict) -> List[Dict]:
        """Return mock directives for demo"""
        return [
            {
                "directive_text": "The respondent shall pay compensation of Rs. 50,000 to the petitioner within 30 days.",
                "directive_type": "monetary",
                "priority": "high",
                "confidence_score": 0.95,
                "action_required": "Payment of compensation",
                "responsible_entity": "Respondent",
                "deadline_text": "within 30 days"
            },
            {
                "directive_text": "The department shall file a compliance report within 60 days.",
                "directive_type": "compliance",
                "priority": "medium",
                "confidence_score": 0.88,
                "action_required": "File compliance report",
                "responsible_entity": "Department",
                "deadline_text": "within 60 days"
            }
        ]
    
    async def assign_department(self, directive: Dict, mapping: Dict) -> Dict:
        """Return mock department assignment"""
        departments = ["Home Department", "Finance Department", "Legal Department"]
        return {
            "assigned_department": random.choice(departments),
            "confidence_score": 0.85
        }
```

### Step 2: Update LLM Service to Use Mock

In `backend/app/services/ai/llm_service.py`, add fallback to mock:

```python
# At the top
from app.services.ai.mock_llm import MockLLMService

# In __init__
if settings.LLM_PROVIDER == "mock" or not self.llm:
    self.llm = MockLLMService()
    logger.info("Using mock LLM service for demo")
```

### Step 3: Set Environment Variable

In Railway:
```
LLM_PROVIDER=mock
```

### Step 4: Redeploy

The processing will now complete in seconds with mock data!

---

## Testing After Fix

1. Upload a PDF
2. Processing should complete in 5-10 seconds
3. You'll see 2 mock directives extracted
4. Can proceed to verification and action plan

---

## For Production Deployment

For actual production use:
1. Use OpenAI API (recommended)
2. Or self-host Ollama on dedicated server
3. Add proper timeout handling (30s max)
4. Add retry logic
5. Add fallback to manual entry if AI fails

---

## Current Status

- ✅ Backend API working
- ✅ Database connected
- ✅ Authentication working
- ✅ File upload working
- ❌ AI processing hanging (needs fix above)
- ⏳ Frontend environment variables (needs Vercel dashboard setup)
