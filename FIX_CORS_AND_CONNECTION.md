# Fix CORS and Connection Issues

## Problems Identified

1. ❌ **Frontend connecting to localhost:8000** instead of Railway
2. ❌ **CORS blocking requests** from Vercel to Railway
3. ❌ **502 Bad Gateway** - Backend might be down

---

## Solution 1: Fix Frontend Environment Variable (CRITICAL)

### Problem
Frontend is trying to connect to `localhost:8000` instead of Railway backend.

### Root Cause
Vercel **does NOT automatically read `.env.production` files**. You must set environment variables in Vercel Dashboard.

### Fix Steps

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Select your project: **court-pilot-ai**

2. **Go to Settings → Environment Variables**

3. **Add this variable**:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://courtpilotai-production.up.railway.app/api/v1`
   - **Environment**: Select **Production** (and optionally Preview, Development)

4. **Redeploy**
   - Go to **Deployments** tab
   - Click the **3 dots** on latest deployment
   - Click **Redeploy**
   - OR: Push any change to trigger redeploy

### Verify
After redeploy, check browser console. Should NOT see `localhost:8000` anymore.

---

## Solution 2: Fix CORS in Railway (CRITICAL)

### Problem
Backend is blocking requests from Vercel frontend due to CORS policy.

### Current CORS Config
The code has:
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://court-pilot-ai.vercel.app"
]
```

This is correct, BUT Railway might be overriding it with an environment variable.

### Fix Steps

**Option A: Remove CORS_ORIGINS from Railway** (Recommended)

1. Go to **Railway Dashboard → Backend Service → Variables**
2. Look for `CORS_ORIGINS` variable
3. If it exists, **DELETE IT**
4. Let the code use the default (which includes Vercel URL)
5. Redeploy

**Option B: Set CORS_ORIGINS in Railway**

1. Go to **Railway Dashboard → Backend Service → Variables**
2. Add or update:
   - **Name**: `CORS_ORIGINS`
   - **Value**: `["http://localhost:3000","http://localhost:5173","https://court-pilot-ai.vercel.app"]`
3. Redeploy

**Option C: Allow All Origins** (Quick fix for testing)

1. Go to **Railway Dashboard → Backend Service → Variables**
2. Add:
   - **Name**: `CORS_ORIGINS`
   - **Value**: `["*"]`
3. Redeploy

⚠️ **Option C is less secure but good for testing**

---

## Solution 3: Check Backend Status

### Problem
Getting 502 Bad Gateway errors.

### Check Steps

1. **Test Backend Health**
   ```bash
   curl https://courtpilotai-production.up.railway.app/health
   ```
   
   **Expected**: `{"status":"healthy",...}`
   
   **If fails**: Backend is down, check Railway logs

2. **Check Railway Deployment**
   - Go to Railway Dashboard → Backend Service
   - Check deployment status
   - Should show "Active" with green dot
   - If not, check logs for errors

3. **Check Railway Logs**
   - Railway Dashboard → Backend → Deployments → Latest → View Logs
   - Look for errors during startup
   - Look for CORS-related messages

---

## Quick Fix Summary

### In Vercel (Frontend)
```
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Add: VITE_API_URL = https://courtpilotai-production.up.railway.app/api/v1
4. Redeploy
```

### In Railway (Backend)
```
1. Go to Railway Dashboard
2. Backend Service → Variables
3. Remove CORS_ORIGINS variable (if exists)
   OR
   Set CORS_ORIGINS = ["*"] for testing
4. Redeploy
```

---

## Testing After Fix

### Test 1: Check Frontend API URL

1. Open: https://court-pilot-ai.vercel.app
2. Open browser console (F12)
3. Try to login
4. Check Network tab
5. **Should see requests to**: `https://courtpilotai-production.up.railway.app`
6. **Should NOT see**: `localhost:8000`

### Test 2: Check CORS

1. Open: https://court-pilot-ai.vercel.app
2. Try to login
3. Check browser console
4. **Should NOT see**: "blocked by CORS policy"
5. **Should see**: Successful API requests

### Test 3: Upload PDF

1. Login successfully
2. Upload a PDF
3. **Should NOT see**: Connection refused errors
4. **Should see**: Processing starts

---

## Expected Errors vs Fixed

### Before Fix
```
❌ localhost:8000/api/v1/judgments/upload: Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ Access to fetch at 'https://courtpilotai-production.up.railway.app/...' has been blocked by CORS policy
❌ GET https://courtpilotai-production.up.railway.app/... net::ERR_FAILED 502
```

### After Fix
```
✅ POST https://courtpilotai-production.up.railway.app/api/v1/auth/login 200 OK
✅ POST https://courtpilotai-production.up.railway.app/api/v1/judgments/upload 200 OK
✅ POST https://courtpilotai-production.up.railway.app/api/v1/judgments/.../process 200 OK
```

---

## Detailed Steps with Screenshots

### Vercel Environment Variable Setup

1. **Login to Vercel**
   - Go to: https://vercel.com/dashboard

2. **Select Project**
   - Click on: **court-pilot-ai**

3. **Go to Settings**
   - Click **Settings** tab at top

4. **Environment Variables**
   - Click **Environment Variables** in left sidebar

5. **Add Variable**
   - Click **Add New** button
   - **Key**: `VITE_API_URL`
   - **Value**: `https://courtpilotai-production.up.railway.app/api/v1`
   - **Environments**: Check **Production** (minimum)
   - Click **Save**

6. **Redeploy**
   - Go to **Deployments** tab
   - Find latest deployment
   - Click **...** (three dots)
   - Click **Redeploy**
   - Wait 1-2 minutes

### Railway CORS Fix

1. **Login to Railway**
   - Go to: https://railway.app/dashboard

2. **Select Project**
   - Click your **courtpilotai-production** project

3. **Select Backend Service**
   - Click the **backend** service

4. **Go to Variables**
   - Click **Variables** tab

5. **Check for CORS_ORIGINS**
   - Look for `CORS_ORIGINS` in the list
   - If exists and has wrong value → Delete it
   - If doesn't exist → Good, nothing to do

6. **Optional: Add CORS_ORIGINS**
   - Click **+ New Variable**
   - **Name**: `CORS_ORIGINS`
   - **Value**: `["*"]`
   - Click **Add**

7. **Redeploy**
   - Railway auto-redeploys on variable change
   - Wait 2-3 minutes
   - Check logs for "Application startup complete"

---

## Verification Commands

### Test Backend Directly
```bash
# Health check
curl https://courtpilotai-production.up.railway.app/health

# Login test
curl -X POST https://courtpilotai-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gov.in","password":"Admin123"}'
```

### Check CORS Headers
```bash
curl -I -X OPTIONS https://courtpilotai-production.up.railway.app/api/v1/auth/login \
  -H "Origin: https://court-pilot-ai.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

**Should see**:
```
Access-Control-Allow-Origin: https://court-pilot-ai.vercel.app
```

---

## Priority Order

1. **FIRST**: Fix Vercel environment variable (VITE_API_URL)
2. **SECOND**: Fix Railway CORS (remove or set CORS_ORIGINS)
3. **THIRD**: Test backend health
4. **FOURTH**: Test frontend login
5. **FIFTH**: Test PDF upload

---

## Timeline

- **Vercel fix**: 2 minutes + 1-2 min redeploy = 3-4 minutes
- **Railway fix**: 1 minute + 2-3 min redeploy = 3-4 minutes
- **Testing**: 2 minutes
- **Total**: ~10 minutes to fully working

---

## After Both Fixes

Your app should:
- ✅ Frontend connects to Railway (not localhost)
- ✅ CORS allows requests from Vercel
- ✅ Login works
- ✅ PDF upload works
- ✅ AI processing starts
- ✅ Full demo flow works

---

## Still Having Issues?

### Check Railway Logs
```
Railway Dashboard → Backend → Deployments → Latest → View Logs
```

Look for:
- Startup errors
- CORS configuration messages
- LLM initialization messages

### Check Vercel Logs
```
Vercel Dashboard → Deployments → Latest → View Function Logs
```

Look for:
- Build errors
- Environment variable issues

### Check Browser Console
```
F12 → Console tab
```

Look for:
- API URL being used (should be Railway, not localhost)
- CORS errors (should be none)
- Network errors (should be none)

---

**Do these fixes in order and report back what you see!**
