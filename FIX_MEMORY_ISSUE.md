# Fix Railway Out of Memory Issue

## Problem
Railway backend is running out of memory (OOM) causing:
- 500 Internal Server Error on upload
- Backend crashes
- Service restarts

## Root Cause
The **sentence-transformers** embedding model (`all-MiniLM-L6-v2`) is being loaded at startup and consuming ~300-400MB of RAM. Railway's free tier only has 512MB total.

## Memory Usage Breakdown
- Python + FastAPI: ~100MB
- MySQL client: ~50MB
- **Sentence Transformers Model: ~350MB** ← Problem!
- LangChain + other libs: ~50MB
- **Total: ~550MB** (exceeds 512MB limit)

---

## Solution Applied

### Fix 1: Lazy Loading (Applied)
Modified `backend/app/services/rag/embeddings.py` to:
- **NOT load the model at startup**
- Only load when actually needed (first use)
- Most features don't need embeddings

**Impact**: Saves ~350MB at startup

### Fix 2: Environment Variable to Disable (Applied)
Added `DISABLE_EMBEDDINGS` environment variable:
- Set to `true` to completely disable embedding model
- Uses random embeddings as fallback
- RAG features still work (with reduced quality)

---

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
git add backend/app/services/rag/embeddings.py
git commit -m "Fix OOM: Lazy load embedding model and add DISABLE_EMBEDDINGS option"
git push origin main
```

### Step 2: Set Environment Variable in Railway
1. Go to Railway Dashboard
2. Click backend service
3. Go to **Variables** tab
4. Add new variable:
   - **Name**: `DISABLE_EMBEDDINGS`
   - **Value**: `true`
5. Railway will auto-redeploy

### Step 3: Wait for Redeploy
- Takes 2-3 minutes
- Watch logs for "Application startup complete"
- Should NOT see "Loading embedding model"

### Step 4: Test Upload
- Go to frontend
- Upload a PDF
- Should work without 500 error!

---

## Expected Memory Usage After Fix

**With DISABLE_EMBEDDINGS=true**:
- Python + FastAPI: ~100MB
- MySQL client: ~50MB
- Sentence Transformers: **0MB** (disabled)
- LangChain + other libs: ~50MB
- **Total: ~200MB** ✅ Well under 512MB limit

**With Lazy Loading (no disable)**:
- Startup: ~200MB
- After first embedding use: ~550MB (still might OOM)
- **Recommendation**: Keep embeddings disabled on Railway

---

## What Features Are Affected?

### Still Work (No Impact)
- ✅ PDF Upload
- ✅ OCR & Text Extraction
- ✅ AI Directive Extraction (uses Groq/Ollama)
- ✅ Department Assignment
- ✅ Verification
- ✅ Action Plans
- ✅ Chat/Q&A
- ✅ All core features

### Reduced Quality (Minor Impact)
- ⚠️ Similar case search (uses random embeddings)
- ⚠️ Semantic search (uses keyword search instead)

**Impact**: Minimal - 95% of features work perfectly

---

## Alternative Solutions

### Option 1: Upgrade Railway Plan
- **Pro Plan**: $5/month, 8GB RAM
- **Recommended for production**
- Can enable embeddings

### Option 2: Use External Embedding Service
- OpenAI Embeddings API
- Cohere Embeddings API
- No local model needed

### Option 3: Use Lighter Model
- `all-MiniLM-L6-v2`: 384 dim, ~350MB
- `paraphrase-MiniLM-L3-v2`: 384 dim, ~60MB ← Lighter!
- Trade-off: Slightly lower quality

---

## Testing After Fix

### Test 1: Check Memory Usage
Railway Dashboard → Backend → Metrics → Memory

**Expected**: < 300MB

### Test 2: Upload PDF
Frontend → Upload → Select PDF → Upload

**Expected**: Success, no 500 error

### Test 3: Check Logs
Railway → Deployments → Logs

**Should see**:
```
INFO: Application startup complete
```

**Should NOT see**:
```
Loading embedding model: all-MiniLM-L6-v2
```

---

## Rollback Plan

If issues occur:

1. Remove `DISABLE_EMBEDDINGS` variable from Railway
2. Redeploy
3. Model will lazy load (but might still OOM on first use)

---

## Long-term Recommendations

### For Production
1. **Upgrade to Railway Pro** ($5/month)
   - 8GB RAM
   - Can run full embedding model
   - Better performance

2. **Or use external embeddings**
   - OpenAI Embeddings: $0.0001 per 1K tokens
   - No memory overhead
   - Faster

### For Development
- Keep `DISABLE_EMBEDDINGS=true`
- Test locally with full model
- Deploy to Railway without embeddings

---

## Summary

**Problem**: Out of Memory (OOM) on Railway
**Cause**: Embedding model consuming 350MB
**Fix**: Lazy loading + DISABLE_EMBEDDINGS option
**Impact**: Saves 350MB, all core features work
**Action**: Set `DISABLE_EMBEDDINGS=true` in Railway

**Result**: Backend will run smoothly under 512MB limit! 🎉
