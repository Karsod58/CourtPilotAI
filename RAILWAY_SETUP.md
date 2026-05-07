# Railway Backend Setup Guide

## Current Status
✅ Backend deployed successfully on Railway
✅ Database (MySQL) connected
✅ Authentication working
✅ All API endpoints responding

## Issue: AI Processing Hanging

### Problem
When uploading a PDF, the AI processing hangs at 8% and never completes. This is because the backend is trying to use Ollama Cloud API which is slow and times out.

### Solution: Use Mock LLM for Demo

To make the demo work instantly, we've implemented a mock LLM service that returns realistic data without external API calls.

## Steps to Fix

### 1. Set Environment Variable in Railway

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to **Variables** tab
4. Add or update this variable:
   ```
   LLM_PROVIDER=mock
   ```
5. Click **Deploy** or wait for auto-redeploy

### 2. Verify the Change

After deployment completes:

1. Upload a PDF through the frontend
2. Processing should complete in 5-10 seconds
3. You'll see 2-4 mock directives extracted
4. Can proceed to verification and action plan

## What the Mock Service Does

The mock LLM service (`backend/app/services/ai/mock_llm.py`) provides:

- **Instant directive extraction** (no API calls)
- **Realistic mock data** that looks like real AI output
- **Department assignment** based on directive type
- **Chat responses** for Q&A features
- **Judgment summaries**

## Current Railway Environment Variables

Make sure these are set:

```env
# Required
DATABASE_URL_OVERRIDE=mysql://root:vKSXILoCYKqhkVvldoZAiIPcxjPAUnHr@mysql.railway.internal:3306/railway
SECRET_KEY=vK8mN2pQ9rT5wX7yZ3aB6cD8eF1gH4jK6mN9pQ2rT5wX8yZ1aB4cD7eF0gH3jK
LLM_PROVIDER=mock

# Optional (for production with real AI)
ENVIRONMENT=production
DEBUG=False
```

## For Production with Real AI

When you're ready to use real AI instead of mock data:

### Option 1: OpenAI (Recommended)
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-3.5-turbo
```

### Option 2: Self-hosted Ollama
1. Deploy Ollama on a separate server
2. Set:
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://your-ollama-server:11434
   OLLAMA_MODEL=llama3.1:8b
   ```

## Testing the Backend

### Health Check
```bash
curl https://courtpilotai-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "app": "CourtPilot",
  "version": "1.0.0",
  "environment": "production"
}
```

### Login Test
```bash
curl -X POST https://courtpilotai-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gov.in","password":"Admin123"}'
```

Expected response:
```json
{
  "user": {
    "id": "5",
    "name": "Admin User",
    "email": "admin@gov.in",
    "department": "Administration",
    "role": "Admin",
    "employeeId": "GOV001"
  },
  "token": "mock-jwt-token-5"
}
```

## Demo Users

| Email | Password | Role | Employee ID |
|-------|----------|------|-------------|
| admin@gov.in | Admin123 | Admin | GOV001 |
| legal@gov.in | Legal123 | Legal Officer | GOV002 |
| compliance@gov.in | Compliance123 | Manager | GOV003 |
| head@gov.in | Head123 | Department Head | GOV004 |

## Troubleshooting

### Backend not responding
1. Check Railway logs for errors
2. Verify PORT is set to 8080 in Railway networking settings
3. Check DATABASE_URL_OVERRIDE is correct

### AI processing still hanging
1. Verify `LLM_PROVIDER=mock` is set in Railway variables
2. Check Railway logs for LLM initialization messages
3. Should see: "Using mock LLM service for directive extraction"

### Database connection errors
1. Verify MySQL service is running in Railway
2. Check DATABASE_URL_OVERRIDE format: `mysql://user:pass@host:port/db`
3. Backend automatically converts to `mysql+aiomysql://...`

## Railway Deployment Files

- `nixpacks.toml` - Build configuration
- `Procfile` - Start command
- `runtime.txt` - Python version
- `requirements.txt` - Dependencies

## Next Steps

1. Set `LLM_PROVIDER=mock` in Railway
2. Wait for redeploy (2-3 minutes)
3. Test PDF upload and processing
4. Verify directives are extracted
5. Demo is ready! 🎉
