# Deploy to Render

## Backend Deployment (Render)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Deploy Backend

1. **Click "New +" → "Web Service"**

2. **Connect Repository**
   - Select your GitHub repository
   - Click "Connect"

3. **Configure Service**
   - **Name**: `courtpilot-backend`
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Select Plan**
   - Choose **Free** plan

5. **Add Environment Variables**
   Click "Advanced" → Add these variables:

   ```
   DEBUG=False
   ENVIRONMENT=production
   HOST=0.0.0.0
   PORT=10000
   
   # Database (Render provides free PostgreSQL)
   USE_SQLITE=False
   DATABASE_URL=<will be auto-filled if you add PostgreSQL>
   
   # AI Provider (choose one)
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=https://ollama.com
   OLLAMA_API_KEY=your_key_here
   OLLAMA_MODEL=gemma3:12b
   
   # OR use OpenAI
   # LLM_PROVIDER=openai
   # OPENAI_API_KEY=your_key_here
   
   # Security
   SECRET_KEY=<generate with: openssl rand -hex 32>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   
   # CORS (add your Vercel URL after frontend deployment)
   CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:5173"]
   
   # Vector Store
   VECTOR_STORE_TYPE=faiss
   VECTOR_STORE_PATH=./data/vector_store
   
   # Document Storage
   DOCUMENT_STORAGE_PATH=./data/documents
   MAX_UPLOAD_SIZE=52428800
   
   # Features
   ENABLE_RAG=True
   ENABLE_AUTO_EXTRACT=True
   ```

6. **Add PostgreSQL Database (Optional but Recommended)**
   - Click "New +" → "PostgreSQL"
   - Name: `courtpilot-db`
   - Plan: Free
   - After creation, copy the "Internal Database URL"
   - Add it as `DATABASE_URL` in your web service environment variables

7. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - Your backend URL: `https://courtpilot-backend.onrender.com`

### Step 3: Verify Backend

```bash
# Health check
curl https://courtpilot-backend.onrender.com/health

# API docs
# Open in browser: https://courtpilot-backend.onrender.com/docs
```

---

## Frontend Deployment (Vercel)

### Step 1: Deploy Frontend

```bash
cd frontend
npm install -g vercel
vercel login
vercel
```

### Step 2: Set Environment Variable

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://courtpilot-backend.onrender.com/api/v1`
5. Redeploy: `vercel --prod`

---

## Important Notes

### Render Free Tier Limitations
- **Spins down after 15 minutes of inactivity**
- First request after spin-down takes 30-60 seconds
- 750 hours/month free (enough for one service)
- 512 MB RAM, 0.1 CPU

### Keep Backend Alive (Optional)
Use a service like UptimeRobot to ping your backend every 10 minutes:
- URL to ping: `https://courtpilot-backend.onrender.com/health`
- Interval: 10 minutes

### CORS Configuration
After deploying frontend, update CORS in backend:

1. Go to Render Dashboard → Your Service
2. Environment → Edit `CORS_ORIGINS`
3. Add your Vercel URL: `["https://your-app.vercel.app"]`
4. Save (auto-redeploys)

---

## Troubleshooting

### Backend Won't Start
- Check Render logs
- Verify all environment variables are set
- Check `requirements.txt` has all dependencies

### Frontend Can't Connect to Backend
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Check backend is running (not spun down)

### Database Errors
- Ensure PostgreSQL is created and connected
- Verify `DATABASE_URL` is set correctly
- Check database connection in logs

### 502 Bad Gateway
- Backend is starting up (wait 30-60 seconds)
- Check Render logs for errors

---

## Production Checklist

- [ ] Backend deployed to Render
- [ ] PostgreSQL database created and connected
- [ ] All environment variables set
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` configured in Vercel
- [ ] CORS updated with Vercel URL
- [ ] Health check passes
- [ ] Can access API docs
- [ ] Can login to frontend
- [ ] Can upload judgment
- [ ] Can verify directives

**Done! Your app is live.**

Backend: `https://courtpilot-backend.onrender.com`
Frontend: `https://your-app.vercel.app`
