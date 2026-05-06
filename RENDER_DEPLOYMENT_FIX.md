# Render Deployment Fix

## Error Analysis

Your Render deployment crashed with this error:
```
ImportError: email-validator is not installed, run `pip install 'pydantic[email]'`
```

## Root Cause

You're using `EmailStr` from Pydantic in your `auth.py` file, but the `email-validator` package was missing from `requirements.txt`.

## Fixes Applied

### 1. ✅ Added Missing Dependency
**File**: `backend/requirements.txt`

```python
# Data Validation
pydantic>=2.5.3
pydantic-settings>=2.1.0
email-validator>=2.1.0  # ← ADDED THIS
```

### 2. ✅ Fixed Deprecated FastAPI Parameters
**Files**: `backend/app/api/v1/alerts.py`, `backend/app/api/v1/search.py`

Changed `regex=` to `pattern=` in Query parameters (FastAPI deprecated `regex` in favor of `pattern`):

```python
# Before (deprecated)
severity: Optional[str] = Query(None, regex="^(critical|high|medium|low)$")

# After (correct)
severity: Optional[str] = Query(None, pattern="^(critical|high|medium|low)$")
```

## Next Steps

### 1. Commit and Push Changes

```bash
git add backend/requirements.txt backend/app/api/v1/alerts.py backend/app/api/v1/search.py
git commit -m "fix: add email-validator dependency and fix deprecated regex parameter"
git push origin main
```

### 2. Redeploy on Render

Render will automatically detect the new commit and redeploy. Or you can manually trigger a redeploy from the Render dashboard.

### 3. Monitor Deployment

Watch the deploy logs in Render dashboard. The app should now start successfully.

## Expected Deployment Size

Based on your dependencies:
- **Estimated size**: 1.2 - 1.5 GB
- **Build time**: 5-10 minutes
- **Status**: ✅ Render can handle this size (no limits)

## Other Warnings (Non-Critical)

These warnings won't crash your app but are good to know:

### 1. OpenCV Warning
```
WARNING | opencv-python not available - image preprocessing will be disabled
```
**Impact**: Image preprocessing for OCR won't work
**Fix**: Already in requirements.txt, should install fine

### 2. Ollama Warning
```
WARNING | Ollama client not available
```
**Impact**: Local Ollama won't work (expected on Render)
**Solution**: Use cloud Ollama URL in environment variables

### 3. LangChain Deprecation
```
LangChainDeprecationWarning: The class `ChatOllama` was deprecated
```
**Impact**: None currently, but should update in future
**Fix**: Run `pip install -U langchain-ollama` and update imports

### 4. Embeddings Warning
```
WARNING | Embeddings not available, some features may be limited
```
**Impact**: RAG features might be limited
**Check**: Ensure sentence-transformers is installing correctly

## Render Configuration Checklist

Make sure these are set in Render dashboard:

### Environment Variables
```
DATABASE_URL=mysql://user:pass@host:port/dbname
OLLAMA_BASE_URL=https://your-ollama-server.com
SECRET_KEY=your-secret-key-here
ENVIRONMENT=production
```

### Build Command
```bash
pip install --no-cache-dir -r requirements.txt
```

### Start Command
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Health Check Path
```
/health
```

## Troubleshooting

### If deployment still fails:

1. **Check Build Logs** - Look for package installation errors
2. **Check Memory Usage** - Free tier has 512 MB RAM (might be tight)
3. **Check Database Connection** - Ensure DATABASE_URL is correct
4. **Check Port Binding** - Ensure using `$PORT` environment variable

### Common Issues:

**Issue**: Out of memory during build
**Solution**: Upgrade to paid tier ($7/month for 512 MB - 2 GB RAM)

**Issue**: Sentence-transformers taking too long
**Solution**: Consider using OpenAI embeddings API instead (lighter)

**Issue**: Cold starts (free tier)
**Solution**: Upgrade to paid tier for always-on service

## Deployment Status

- ✅ Missing dependency fixed (`email-validator`)
- ✅ Deprecated parameters fixed (`regex` → `pattern`)
- ✅ Ready to redeploy
- ⏳ Waiting for you to push changes and redeploy

## After Successful Deployment

1. Test the API endpoints:
   ```bash
   curl https://your-app.onrender.com/health
   curl https://your-app.onrender.com/api/v1/judgments
   ```

2. Update frontend environment variable:
   ```
   VITE_API_URL=https://your-app.onrender.com
   ```

3. Deploy frontend to Vercel

4. Test the full stack!

---

**Status**: ✅ FIXES READY - Push and redeploy!
**Date**: May 6, 2026
