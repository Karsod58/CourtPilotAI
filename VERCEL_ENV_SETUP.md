# Vercel Environment Variables Setup

## Issue
The frontend is not connecting to the backend API correctly. The error shows:
```
POST //auth/login HTTP/1.1" 404 Not Found
```

This means the `VITE_API_URL` environment variable is not being read by Vercel.

## Solution: Set Environment Variables in Vercel Dashboard

### Step 1: Go to Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click on your **court-pilot-ai** project
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

### Step 2: Add Environment Variables

Add the following environment variables:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_API_URL` | `https://courtpilotai-production.up.railway.app/api/v1` | Production |
| `VITE_APP_NAME` | `CourtPilot AI` | Production |
| `VITE_APP_VERSION` | `1.0.0` | Production |

**IMPORTANT**: Make sure to select **Production** environment for each variable!

### Step 3: Redeploy

After adding the environment variables:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Check "Use existing Build Cache" (optional)
6. Click **Redeploy**

OR simply push a new commit to trigger automatic redeployment.

---

## Alternative: Use Vercel CLI

If you have Vercel CLI installed:

```bash
cd frontend

# Set environment variables
vercel env add VITE_API_URL production
# Enter: https://courtpilotai-production.up.railway.app/api/v1

vercel env add VITE_APP_NAME production
# Enter: CourtPilot AI

vercel env add VITE_APP_VERSION production
# Enter: 1.0.0

# Redeploy
vercel --prod
```

---

## Verify the Fix

After redeployment:

1. Go to https://court-pilot-ai.vercel.app
2. Open Browser DevTools (F12)
3. Go to **Network** tab
4. Try to login with:
   - Email: `admin@gov.in`
   - Password: `Admin123`
5. Check the network request - it should show:
   ```
   POST https://courtpilotai-production.up.railway.app/api/v1/auth/login
   ```
   (NOT `POST //auth/login`)

---

## Why .env.production Doesn't Work

Vercel doesn't automatically read `.env.production` files for security reasons. You must set environment variables through:
1. Vercel Dashboard (recommended)
2. Vercel CLI
3. `vercel.json` configuration (not recommended for secrets)

---

## Current Environment Variables Needed

```env
VITE_API_URL=https://courtpilotai-production.up.railway.app/api/v1
VITE_APP_NAME=CourtPilot AI
VITE_APP_VERSION=1.0.0
```

**Note**: All Vite environment variables must start with `VITE_` to be exposed to the client-side code.

---

## Test After Setup

Login credentials for testing:
- Email: `admin@gov.in`
- Password: `Admin123`

Expected behavior:
- ✅ Login request goes to correct URL
- ✅ Backend responds with user data
- ✅ User is redirected to dashboard
- ✅ Toast notification shows "Login successful!"
