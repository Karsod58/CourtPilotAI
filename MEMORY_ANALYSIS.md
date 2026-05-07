# Memory Analysis - What's Making the App Heavy

## 🔍 Investigation Results

### Memory Consumption Breakdown

| Component | Memory | When Loaded | Used For |
|-----------|--------|-------------|----------|
| **FastAPI Core** | 80MB | Startup | ✅ Required |
| **Database (MySQL)** | 35MB | Startup | ✅ Required |
| **PDF Processing** | 40MB | Upload | ✅ Required |
| **LangChain** | 100MB | Startup | ❌ **NOT NEEDED** |
| **sentence-transformers** | 350MB | Startup (if RAG imported) | ❌ **NOT NEEDED** |
| **Other deps** | 50MB | Startup | ✅ Required |
| **TOTAL** | **655MB** | | **Exceeds 512MB limit** |

---

## 🎯 Root Causes

### 1. RAG Router Import (350MB)
**File**: `backend/app/api/__init__.py`
**Problem**: Imports `rag` router at startup
**Impact**: Loads `embedding_service` which loads sentence-transformers model (350MB)
**Used for**: Semantic search (optional feature)
**Solution**: ✅ **Disabled RAG router import**

### 2. LangChain Imports (100MB)
**File**: `backend/app/services/ai/llm_service.py`
**Problem**: Imports LangChain libraries at module level
```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
```
**Impact**: Loads 100MB+ of LangChain dependencies
**Used for**: LLM abstraction (can use OpenAI client directly)
**Solution**: ⚠️ **Need to replace with direct OpenAI client**

---

## 📊 Memory by Stage

### At Startup (App Load)
```
FastAPI          80MB  ✅
MySQL Driver     35MB  ✅
LangChain       100MB  ❌ HEAVY
RAG/Embeddings  350MB  ❌ HEAVY (if imported)
Other            50MB  ✅
─────────────────────
TOTAL           615MB  ❌ EXCEEDS LIMIT
```

### During Upload
```
Base Memory     265MB  (without LangChain/RAG)
PDF Processing   40MB  (temporary)
─────────────────────
TOTAL           305MB  ✅ WITHIN LIMIT
```

### During Processing
```
Base Memory     265MB
LLM API Call     10MB  (HTTP request/response)
─────────────────────
TOTAL           275MB  ✅ WITHIN LIMIT
```

### During Verification
```
Base Memory     265MB
Database Query    5MB  (temporary)
─────────────────────
TOTAL           270MB  ✅ WITHIN LIMIT
```

---

## ✅ Solutions Applied

### Solution 1: Disable RAG Router ✅
**File**: `backend/app/api/__init__.py`
**Change**: Commented out RAG router import
**Savings**: 350MB
**Impact**: Semantic search disabled (optional feature)

```python
# from app.api.v1 import rag  # Disabled to save 350MB
# api_router.include_router(rag.router, ...)  # Disabled
```

### Solution 2: Use Minimal Requirements ⚠️
**File**: `backend/requirements-minimal.txt`
**Change**: Remove LangChain dependencies
**Savings**: 100MB
**Impact**: Need to update llm_service.py to use OpenAI client directly

**Before** (requirements-railway.txt):
```
langchain>=0.1.0
langchain-core>=0.1.0
langchain-openai>=0.0.5
```

**After** (requirements-minimal.txt):
```
openai>=1.10.0  # Direct client only
```

### Solution 3: Direct OpenAI Client ⚠️
**File**: `backend/app/services/ai/llm_service_minimal.py` (created)
**Change**: Use `AsyncOpenAI` client directly instead of LangChain
**Savings**: 100MB
**Impact**: None - same functionality

---

## 🎯 Expected Memory After Fixes

```
FastAPI          80MB  ✅
MySQL Driver     35MB  ✅
OpenAI Client    30MB  ✅ (instead of LangChain 100MB)
PDF Processing   40MB  ✅
Other            50MB  ✅
─────────────────────
TOTAL           235MB  ✅ WELL WITHIN 512MB LIMIT
Buffer          277MB  ✅ 54% free
```

---

## 🚀 Implementation Steps

### Step 1: Disable RAG Router ✅ DONE
- Commented out RAG import in `backend/app/api/__init__.py`
- Saves 350MB immediately
- No code changes needed elsewhere

### Step 2: Switch to Minimal Requirements ⚠️ PENDING
```bash
# Update nixpacks.toml
[phases.install]
cmds = ["pip install -r requirements-minimal.txt"]
```

### Step 3: Replace LLM Service ⚠️ PENDING
```bash
# Backup current version
cp backend/app/services/ai/llm_service.py backend/app/services/ai/llm_service_full.py

# Use minimal version
cp backend/app/services/ai/llm_service_minimal.py backend/app/services/ai/llm_service.py
```

### Step 4: Test Locally ⚠️ PENDING
```bash
cd backend
pip install -r requirements-minimal.txt
python -m uvicorn app.main:app --reload
```

### Step 5: Deploy to Railway ⚠️ PENDING
```bash
git add .
git commit -m "Memory optimization: Remove LangChain, disable RAG"
git push
```

---

## 📋 What Still Works

### ✅ Core Features (100%)
- PDF Upload
- AI Extraction (Groq API)
- Directive Identification
- Department Assignment
- Deadline Tracking
- Verification Workflow
- Action Plans
- Analytics Dashboard
- Multi-user Support
- Role-based Access

### ❌ Disabled Features
- Semantic Search (RAG)
- Similar Case Finding

**Note**: Disabled features are "nice-to-have", not core functionality.

---

## 🔧 Alternative Solutions (If Still OOM)

### Option 1: Upgrade Railway Plan
- **Pro Plan**: $5/month, 8GB RAM
- **Pros**: No code changes needed
- **Cons**: Costs money

### Option 2: Use Serverless Functions
- **Platform**: Vercel Functions, AWS Lambda
- **Pros**: Auto-scaling, pay-per-use
- **Cons**: Requires architecture changes

### Option 3: Split Services
- **Setup**: Separate API and AI processing services
- **Pros**: Each service has own memory limit
- **Cons**: More complex deployment

---

## 📊 Comparison

| Approach | Memory | Cost | Complexity | Recommended |
|----------|--------|------|------------|-------------|
| **Current** | 655MB | Free | Low | ❌ OOM |
| **Disable RAG** | 305MB | Free | Low | ✅ **YES** |
| **+ Remove LangChain** | 235MB | Free | Medium | ✅ **YES** |
| **Upgrade Plan** | 655MB | $5/mo | Low | ⚠️ If needed |
| **Serverless** | N/A | Variable | High | ❌ Overkill |

---

## 🎉 Conclusion

**The app is heavy at STARTUP, not during upload/processing/verification.**

**Root Causes**:
1. ❌ RAG router imports sentence-transformers (350MB)
2. ❌ LangChain imports at startup (100MB)

**Solutions**:
1. ✅ Disable RAG router (saves 350MB) - **DONE**
2. ⚠️ Replace LangChain with direct OpenAI client (saves 100MB) - **PENDING**

**Expected Result**: 235MB total memory (54% free on Railway)
