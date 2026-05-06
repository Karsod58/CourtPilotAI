# Backend Deployment Issues - Fixed

## 🔍 Issues Found and Fixed

### ✅ Issue 1: Missing `email-validator` Dependency
**Status**: FIXED ✅

**Problem**: 
```
ImportError: email-validator is not installed
```

**Fix Applied**:
```python
# backend/requirements.txt
email-validator>=2.1.0  # Added
```

---

### ✅ Issue 2: Deprecated FastAPI `regex` Parameter
**Status**: FIXED ✅

**Problem**:
```
FastAPIDeprecationWarning: `regex` has been deprecated, please use `pattern` instead
```

**Files Fixed**:
- `backend/app/api/v1/alerts.py`
- `backend/app/api/v1/search.py`

**Fix Applied**:
```python
# Before
Query(None, regex="^(critical|high|medium|low)$")

# After
Query(None, pattern="^(critical|high|medium|low)$")
```

---

### ✅ Issue 3: Missing `__init__.py` in `core` Package
**Status**: FIXED ✅

**Problem**: 
The `backend/app/core/` directory was missing `__init__.py`, which could cause import errors in production.

**Fix Applied**:
Created `backend/app/core/__init__.py`:
```python
"""
Core application components
"""
from app.core.config import settings
from app.core.database import get_db, init_db

__all__ = ["settings", "get_db", "init_db"]
```

---

### ✅ Issue 4: Wrong Build Command in `render.yaml`
**Status**: FIXED ✅

**Problem**:
`render.yaml` was using `requirements-minimal.txt` which doesn't have all dependencies.

**Fix Applied**:
```yaml
# Before
buildCommand: pip install -r requirements-minimal.txt

# After
buildCommand: pip install --no-cache-dir -r requirements.txt
```

---

## ✅ Verified Working Components

### 1. Database Configuration ✅
- Properly handles SQLite, MySQL, and PostgreSQL
- Uses `DATABASE_URL_OVERRIDE` for Render/Railway
- Converts `postgres://` to `postgresql+asyncpg://` automatically
- Pool configuration is appropriate

### 2. Async/Await Patterns ✅
- All API endpoints are properly async
- Database sessions use async context managers
- No blocking operations in async functions

### 3. File Paths ✅
- No hardcoded Windows paths (C:, D:, etc.)
- Uses relative paths and `os.path.join()`
- Compatible with Linux (Render uses Linux)

### 4. Environment Variables ✅
- All secrets use environment variables
- No hardcoded API keys or passwords
- Proper defaults for development
- Production-ready configuration

### 5. Import Structure ✅
- All imports use `from app.` prefix
- No circular import issues detected
- All `__init__.py` files present

### 6. File Uploads ✅
- Proper file validation (type, size)
- Uses temporary files correctly
- Cleans up after processing
- Error handling in place

### 7. CORS Configuration ✅
- Configurable via environment variable
- Defaults include localhost for development
- Can be updated for production domains

---

## 🚨 Potential Issues to Monitor

### 1. Memory Usage (Free Tier)
**Issue**: Render free tier has 512 MB RAM
**Impact**: `sentence-transformers` uses ~500 MB

**Solutions**:
- ✅ Already using `faiss-cpu` (not GPU version)
- ✅ Using lightweight model: `all-MiniLM-L6-v2`
- ⚠️ May need to upgrade to Starter plan ($7/month) if OOM errors occur

**Alternative**: Use OpenAI embeddings API instead:
```python
# In requirements.txt, comment out:
# sentence-transformers>=2.3.1

# Use OpenAI API instead (lighter, ~$0.02 per 1M tokens)
```

---

### 2. Cold Starts (Free Tier)
**Issue**: Free tier spins down after 15 min inactivity
**Impact**: First request takes 30-60 seconds

**Solutions**:
- ✅ Use health check endpoint for monitoring
- ⚠️ Consider upgrading to Starter plan for always-on
- ⚠️ Or use cron job to keep warm: https://cron-job.org

---

### 3. Ollama Configuration
**Issue**: Ollama needs to be accessible from Render
**Impact**: AI features won't work if Ollama is not reachable

**Solutions**:
- ✅ Use cloud Ollama URL in `OLLAMA_BASE_URL`
- ✅ Or use OpenAI/Anthropic as fallback
- ✅ Code already handles Ollama unavailability gracefully

**Environment Variable**:
```bash
OLLAMA_BASE_URL=https://your-ollama-server.com
# Or use OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
```

---

### 4. File Storage
**Issue**: Render's filesystem is ephemeral (resets on redeploy)
**Impact**: Uploaded PDFs and vector indices will be lost

**Solutions**:
- ✅ Use Render Persistent Disk (1 GB free)
- ✅ Mount at `/opt/render/project/data`
- ✅ Update environment variables:
```bash
DOCUMENT_STORAGE_PATH=/opt/render/project/data/documents
VECTOR_STORE_PATH=/opt/render/project/data/vector_store
```

---

### 5. Database Migrations
**Issue**: Tables need to be created on first deploy
**Impact**: App will create tables automatically, but migrations are better

**Current Behavior**:
```python
# In database.py
await conn.run_sync(Base.metadata.create_all)
```

**Recommendation**: Use Alembic for migrations (already in requirements.txt)
```bash
# After first deploy, run:
render run -s courtpilot-backend alembic upgrade head
```

---

## 📋 Pre-Deployment Checklist

### Code Changes
- [x] Added `email-validator` to requirements.txt
- [x] Fixed deprecated `regex` → `pattern`
- [x] Created `backend/app/core/__init__.py`
- [x] Fixed `render.yaml` build command
- [x] All Python files compile without errors
- [x] No hardcoded secrets or API keys
- [x] No Windows-specific paths

### Configuration Files
- [x] `requirements.txt` - Complete and correct
- [x] `Procfile` - Correct start command
- [x] `render.yaml` - Correct build command
- [x] `.env.example` - All variables documented

### Environment Variables to Set in Render
```bash
# Required
DATABASE_URL_OVERRIDE=<from Render PostgreSQL>
SECRET_KEY=<generate strong random key>
ENVIRONMENT=production
DEBUG=False

# AI Configuration
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=llama3.1:8b
LLM_PROVIDER=ollama

# Storage (if using persistent disk)
DOCUMENT_STORAGE_PATH=/opt/render/project/data/documents
VECTOR_STORE_PATH=/opt/render/project/data/vector_store
LOG_FILE=/opt/render/project/data/logs/courtpilot.log

# CORS (update after frontend deployment)
CORS_ORIGINS=["http://localhost:5173","https://your-app.vercel.app"]

# Optional: OpenAI (if not using Ollama)
# OPENAI_API_KEY=sk-your-key
# LLM_PROVIDER=openai
```

---

## 🧪 Testing Checklist

### After Deployment
- [ ] Health check: `curl https://your-app.onrender.com/health`
- [ ] API docs: `https://your-app.onrender.com/docs`
- [ ] Test upload endpoint
- [ ] Test database connection
- [ ] Check logs for errors
- [ ] Test AI processing (if Ollama configured)
- [ ] Test file storage (if persistent disk configured)

---

## 🔧 Troubleshooting Commands

### View Logs
```bash
# In Render dashboard, go to Logs tab
# Or use Render CLI:
render logs -s courtpilot-backend --tail
```

### Restart Service
```bash
# In Render dashboard, click "Manual Deploy" → "Clear build cache & deploy"
# Or use Render CLI:
render restart -s courtpilot-backend
```

### Check Environment Variables
```bash
# In Render dashboard, go to Environment tab
# Verify all required variables are set
```

### Database Connection Test
```bash
# In Render dashboard, go to Shell tab
# Run:
python -c "from app.core.database import engine; print('DB OK')"
```

---

## 📊 Expected Build Output

### Successful Build
```
==> Building...
==> Installing dependencies from requirements.txt
==> Collecting fastapi>=0.109.0
==> Collecting email-validator>=2.1.0
==> ...
==> Successfully installed all packages
==> Build successful

==> Deploying...
==> Starting service
==> INFO: Started server process
==> INFO: Waiting for application startup
==> INFO: Application startup complete
==> INFO: Uvicorn running on http://0.0.0.0:10000
==> Deploy live at https://courtpilot-backend.onrender.com
```

### Build Time
- **Expected**: 5-10 minutes
- **Factors**: 
  - Installing sentence-transformers (~3-5 min)
  - Installing other dependencies (~2-3 min)
  - First build is slower (no cache)

---

## ✅ Summary

### Issues Fixed: 4
1. ✅ Missing `email-validator` dependency
2. ✅ Deprecated `regex` parameter
3. ✅ Missing `__init__.py` in core package
4. ✅ Wrong build command in render.yaml

### Verified Working: 7
1. ✅ Database configuration
2. ✅ Async/await patterns
3. ✅ File paths (Linux compatible)
4. ✅ Environment variables
5. ✅ Import structure
6. ✅ File uploads
7. ✅ CORS configuration

### Potential Issues: 5
1. ⚠️ Memory usage (may need upgrade)
2. ⚠️ Cold starts (free tier limitation)
3. ⚠️ Ollama configuration (needs cloud URL)
4. ⚠️ File storage (needs persistent disk)
5. ⚠️ Database migrations (use Alembic)

---

**Status**: ✅ READY TO DEPLOY
**Confidence**: HIGH
**Recommendation**: Deploy to Render and monitor logs

---

**Last Updated**: May 6, 2026
**Next Step**: Commit changes and deploy!
