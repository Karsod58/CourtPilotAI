# Complete Deployment Guide - CourtPilot AI

## 🎯 Overview

This guide will help you deploy:
- **Backend**: Render (FastAPI + MySQL)
- **Frontend**: Vercel (React + Vite)

---

## ✅ Pre-Deployment Checklist

### 1. Fixes Applied
- ✅ Added `email-validator>=2.1.0` to requirements.txt
- ✅ Fixed deprecated `regex` → `pattern` in Query parameters
- ✅ All TypeScript errors resolved in frontend
- ✅ UI flow improvements completed

### 2. Files Ready
- ✅ `backend/requirements.txt` - All dependencies listed
- ✅ `backend/app/main.py` - Entry point configured
- ✅ `backend/.env.example` - Environment template
- ✅ `frontend/package.json` - Frontend dependencies

---

## 📦 Part 1: Deploy Backend to Render

### Step 1: Commit Your Changes

```bash
# Add all changes
git add .

# Commit with message
git commit -m "fix: add email-validator and fix deprecated parameters for deployment"

# Push to GitHub
git push origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your CourtPilot repository

### Step 4: Configure Web Service

**Basic Settings:**
```
Name: courtpilot-backend
Region: Oregon (US West) or closest to you
Branch: main
Root Directory: backend
```

**Build Settings:**
```
Runtime: Python 3
Build Command: pip install --no-cache-dir -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Instance Type:**
```
Free (512 MB RAM) - For testing
OR
Starter ($7/month, 512 MB - 2 GB RAM) - For production
```

### Step 5: Add Environment Variables

Click **"Environment"** tab and add these variables:

```bash
# Application
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this-in-production-min-32-chars

# Database (Render will provide this after creating database)
DATABASE_URL_OVERRIDE=postgresql://user:pass@host:port/dbname

# AI Configuration
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=llama3.1:8b
LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b

# CORS (Add your Vercel domain after frontend deployment)
CORS_ORIGINS=["http://localhost:5173","https://your-app.vercel.app"]

# Storage Paths (Render persistent disk)
DOCUMENT_STORAGE_PATH=/opt/render/project/data/documents
VECTOR_STORE_PATH=/opt/render/project/data/vector_store
LOG_FILE=/opt/render/project/logs/courtpilot.log

# Optional: OpenAI (if you want to use OpenAI instead of Ollama)
# OPENAI_API_KEY=sk-your-openai-api-key
# LLM_PROVIDER=openai
# LLM_MODEL=gpt-4
```

### Step 6: Create PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   ```
   Name: courtpilot-db
   Database: courtpilot
   User: courtpilot_user
   Region: Same as your web service
   Plan: Free (256 MB)
   ```
3. Click **"Create Database"**
4. Copy the **Internal Database URL**
5. Go back to your web service → Environment
6. Update `DATABASE_URL_OVERRIDE` with the Internal Database URL

### Step 7: Add Persistent Disk (Optional but Recommended)

1. In your web service, go to **"Disks"** tab
2. Click **"Add Disk"**
3. Configure:
   ```
   Name: courtpilot-storage
   Mount Path: /opt/render/project/data
   Size: 1 GB (Free tier)
   ```
4. Click **"Save"**

### Step 8: Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for build and deployment
3. Monitor logs for any errors

### Step 9: Test Backend

Once deployed, test your backend:

```bash
# Replace with your Render URL
curl https://courtpilot-backend.onrender.com/health

# Expected response:
{
  "status": "healthy",
  "app": "CourtPilot",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 🎨 Part 2: Deploy Frontend to Vercel

### Step 1: Update Frontend API URL

Create/update `frontend/.env.production`:

```bash
VITE_API_URL=https://courtpilot-backend.onrender.com
```

### Step 2: Commit Changes

```bash
git add frontend/.env.production
git commit -m "feat: add production API URL"
git push origin main
```

### Step 3: Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### Step 4: Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Vercel will auto-detect it's a Vite project

### Step 5: Configure Project

**Framework Preset:** Vite
**Root Directory:** `frontend`
**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`

### Step 6: Add Environment Variables

Click **"Environment Variables"** and add:

```bash
VITE_API_URL=https://courtpilot-backend.onrender.com
```

### Step 7: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Vercel will provide a URL like: `https://courtpilot.vercel.app`

### Step 8: Update Backend CORS

1. Go back to Render dashboard
2. Open your web service
3. Go to **"Environment"** tab
4. Update `CORS_ORIGINS`:
   ```bash
   CORS_ORIGINS=["http://localhost:5173","https://courtpilot.vercel.app"]
   ```
5. Save and redeploy

### Step 9: Test Full Stack

1. Open your Vercel URL: `https://courtpilot.vercel.app`
2. Try uploading a judgment
3. Check if API calls work
4. Test the complete flow: Upload → Process → Verify → Action Plan

---

## 🔧 Troubleshooting

### Backend Issues

#### Issue: "email-validator not installed"
**Solution:** Already fixed! Make sure you pushed the updated `requirements.txt`

#### Issue: "Out of memory"
**Solution:** 
- Upgrade to Starter plan ($7/month) for more RAM
- Or use OpenAI embeddings instead of sentence-transformers

#### Issue: "Database connection failed"
**Solution:**
- Check `DATABASE_URL_OVERRIDE` is correct
- Ensure database and web service are in same region
- Use **Internal Database URL** not External

#### Issue: "Cold starts (free tier)"
**Solution:**
- Free tier spins down after 15 min inactivity
- First request after spin down takes 30-60 seconds
- Upgrade to Starter plan for always-on service

### Frontend Issues

#### Issue: "API calls failing"
**Solution:**
- Check `VITE_API_URL` is correct
- Check backend CORS includes your Vercel domain
- Check browser console for CORS errors

#### Issue: "Environment variables not working"
**Solution:**
- Vercel requires `VITE_` prefix for client-side variables
- Redeploy after adding environment variables

---

## 📊 Deployment Size & Performance

### Backend
- **Code Size:** ~2 MB
- **Dependencies:** ~1.2-1.5 GB
- **Total Deployed:** ~1.5 GB
- **Build Time:** 5-10 minutes
- **Cold Start:** 30-60 seconds (free tier)
- **Warm Response:** 100-500ms

### Frontend
- **Code Size:** ~500 KB
- **Dependencies:** ~50 MB
- **Total Deployed:** ~2-3 MB (after build)
- **Build Time:** 2-3 minutes
- **Response Time:** 50-100ms (CDN)

---

## 💰 Cost Breakdown

### Free Tier (Testing)
```
Render Web Service: Free (512 MB RAM, spins down)
Render PostgreSQL: Free (256 MB)
Render Disk: Free (1 GB)
Vercel: Free (100 GB bandwidth)
Total: $0/month
```

### Production Tier (Recommended)
```
Render Web Service: $7/month (512 MB - 2 GB RAM, always-on)
Render PostgreSQL: $7/month (256 MB - 1 GB)
Render Disk: Free (1 GB)
Vercel: Free (100 GB bandwidth)
Total: $14/month
```

### Alternative: Railway
```
Railway (All-in-one): $5/month
Includes: Web service, PostgreSQL, storage
Total: $5/month
```

---

## 🚀 Post-Deployment

### 1. Set Up Custom Domain (Optional)

**Vercel:**
1. Go to Project Settings → Domains
2. Add your domain (e.g., courtpilot.com)
3. Update DNS records as instructed

**Render:**
1. Go to Settings → Custom Domain
2. Add your API domain (e.g., api.courtpilot.com)
3. Update DNS records as instructed

### 2. Set Up Monitoring

**Render:**
- Built-in metrics in dashboard
- Set up email alerts for downtime

**Vercel:**
- Built-in analytics
- Real-time logs

### 3. Set Up CI/CD

Both Render and Vercel auto-deploy on git push:
```bash
git push origin main  # Automatically deploys to both!
```

### 4. Database Backups

**Render PostgreSQL:**
- Free tier: No automatic backups
- Paid tier: Daily automatic backups
- Manual backup: Use `pg_dump`

### 5. Security Checklist

- ✅ Change `SECRET_KEY` to a strong random value
- ✅ Set `DEBUG=False` in production
- ✅ Use HTTPS only (automatic on Render/Vercel)
- ✅ Restrict CORS to your domains only
- ✅ Keep API keys in environment variables
- ✅ Enable rate limiting (add middleware)
- ✅ Set up database backups

---

## 📝 Quick Commands Reference

### Backend (Render)
```bash
# View logs
render logs -s courtpilot-backend

# Restart service
render restart -s courtpilot-backend

# Run database migrations
render run -s courtpilot-backend alembic upgrade head
```

### Frontend (Vercel)
```bash
# Deploy from CLI
cd frontend
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls
```

---

## ✅ Deployment Checklist

### Before Deployment
- [x] Fixed email-validator dependency
- [x] Fixed deprecated regex parameters
- [x] Fixed UI flow issues
- [x] Committed all changes
- [x] Pushed to GitHub

### Backend Deployment
- [ ] Created Render account
- [ ] Created web service
- [ ] Created PostgreSQL database
- [ ] Added environment variables
- [ ] Added persistent disk
- [ ] Deployed successfully
- [ ] Tested /health endpoint
- [ ] Tested API endpoints

### Frontend Deployment
- [ ] Created Vercel account
- [ ] Imported project
- [ ] Added environment variables
- [ ] Deployed successfully
- [ ] Updated backend CORS
- [ ] Tested full application

### Post-Deployment
- [ ] Tested upload flow
- [ ] Tested processing flow
- [ ] Tested verification flow
- [ ] Tested action plan flow
- [ ] Set up monitoring
- [ ] Set up backups
- [ ] Updated documentation

---

## 🆘 Need Help?

**Render Issues:**
- Docs: https://render.com/docs
- Community: https://community.render.com

**Vercel Issues:**
- Docs: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

**CourtPilot Issues:**
- Check logs in Render/Vercel dashboard
- Review error messages
- Check environment variables
- Verify database connection

---

**Status**: ✅ READY TO DEPLOY
**Last Updated**: May 6, 2026
**Next Step**: Commit changes and deploy to Render!
