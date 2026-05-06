# CourtPilot Deployment Guide

## Project Structure
```
courtpilot/
├── frontend/          # React + Vite app
│   ├── vercel.json   # Vercel config
│   └── ...
├── backend/          # FastAPI app
│   ├── app/
│   ├── Procfile     # Railway config
│   └── requirements.txt
└── README.md
```

## Deploy Frontend to Vercel

1. **Navigate to frontend folder**
```bash
cd frontend
```

2. **Install Vercel CLI**
```bash
npm install -g vercel
```

3. **Login and Deploy**
```bash
vercel login
vercel
```

4. **Set Environment Variable in Vercel Dashboard**
   - Go to project settings
   - Add: `VITE_API_URL` = `https://your-backend-url.railway.app/api/v1`

## Deploy Backend to Railway

1. **Go to Railway.app**
   - Visit https://railway.app
   - Sign up/Login with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select `backend` folder as root directory

3. **Set Environment Variables**
   Copy all from `backend/.env.example`:
   - `DEBUG=False`
   - `ENVIRONMENT=production`
   - `DATABASE_URL` (Railway provides PostgreSQL)
   - `OLLAMA_API_KEY` or `OPENAI_API_KEY`
   - `SECRET_KEY` (generate new one)
   - All other required variables

4. **Deploy**
   - Railway auto-detects Python
   - Uses `Procfile` for start command
   - Get your backend URL: `https://your-app.railway.app`

5. **Update Frontend**
   - Go back to Vercel dashboard
   - Update `VITE_API_URL` with Railway backend URL
   - Redeploy frontend

## Alternative: Deploy Both to Railway

1. **Create Two Services**
   - Service 1: Backend (root: `backend/`)
   - Service 2: Frontend (root: `frontend/`)

2. **Backend Service**
   - Set all environment variables
   - Railway auto-deploys

3. **Frontend Service**
   - Set `VITE_API_URL` to backend service URL
   - Add build command: `npm run build`
   - Add start command: `npm run preview`

## Verify Deployment

1. **Backend Health Check**
```bash
curl https://your-backend.railway.app/health
```

2. **Frontend Access**
```
https://your-app.vercel.app
```

3. **Test API Connection**
   - Login to frontend
   - Upload a test judgment
   - Check if it processes correctly

## Troubleshooting

### Backend Issues
- Check Railway logs
- Verify all environment variables are set
- Ensure database is connected

### Frontend Issues
- Check Vercel logs
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend

### CORS Errors
Update `backend/app/core/config.py`:
```python
CORS_ORIGINS = [
    "https://your-app.vercel.app",
    "http://localhost:5173"
]
```

## Production Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set
- [ ] Database connected
- [ ] CORS configured
- [ ] Health check passes
- [ ] Can upload judgment
- [ ] Can verify directives
- [ ] Chat works
- [ ] Lifecycle tracking works

Done! Your app is live.
