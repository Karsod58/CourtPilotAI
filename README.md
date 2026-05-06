# CourtPilot AI - Decision Intelligence Engine

AI-powered system to convert court judgments into verified, trackable action plans.

---

## 🚀 Quick Deploy to Railway

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub
- Get $5 free credit

### 2. Deploy Backend
1. Click "New Project" → "Deploy from GitHub repo"
2. Select this repository
3. Add **MySQL Database**: Click "New" → "Database" → "Add MySQL"
4. Configure service:
   - Root Directory: `backend`
   - Build Command: `pip install --no-cache-dir -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 3. Add Environment Variables
Go to Variables tab and add:

```bash
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=vK8mN2pQ9rT5wX7yZ3aB6cD8eF1gH4jK6mN9pQ2rT5wX8yZ1aB4cD7eF0gH3jK
DATABASE_URL_OVERRIDE=${{MYSQL_URL}}
USE_SQLITE=False
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=2ebce87874da4465951244e35e8d4007.5TmcrjYStknD5XLCQzowAUlq
OLLAMA_MODEL=gemma3:12b
LLM_PROVIDER=ollama
DOCUMENT_STORAGE_PATH=/app/data/documents
VECTOR_STORE_PATH=/app/data/vector_store
LOG_FILE=/app/logs/courtpilot.log
MAX_UPLOAD_SIZE=52428800
CORS_ORIGINS=["http://localhost:5173"]
```

### 4. Deploy Frontend to Vercel
1. Update `frontend/.env.production` with your Railway URL
2. Go to https://vercel.com
3. Import project from GitHub
4. Set Root Directory: `frontend`
5. Add environment variable: `VITE_API_URL=<your-railway-url>`
6. Deploy

### 5. Update CORS
Update Railway `CORS_ORIGINS` with your Vercel URL

---

## 💻 Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Full Stack (Windows)
```bash
start_full_stack.bat
```

---

## 📁 Project Structure

```
courtpilot/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Config & database
│   │   ├── models/   # Database models
│   │   ├── services/ # Business logic
│   │   └── schemas/  # Pydantic schemas
│   └── requirements.txt
├── frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── README.md
```

---

## 🔧 Tech Stack

**Backend:**
- FastAPI (Python web framework)
- MySQL (Database)
- SQLAlchemy (ORM)
- Ollama (AI/LLM)
- LangChain (AI orchestration)
- FAISS (Vector store)

**Frontend:**
- React 18
- TypeScript
- Vite
- React Router
- Axios

---

## 📊 Features

- ✅ PDF judgment upload and processing
- ✅ AI-powered text extraction (OCR)
- ✅ Directive detection and classification
- ✅ Human-in-the-loop verification
- ✅ Action plan generation
- ✅ Department assignment
- ✅ Deadline tracking
- ✅ Compliance monitoring
- ✅ Analytics dashboard
- ✅ Chat assistant with RAG

---

## 🔐 Environment Variables

### Backend Required
- `DATABASE_URL_OVERRIDE` - Database connection URL
- `SECRET_KEY` - JWT secret key
- `OLLAMA_BASE_URL` - Ollama API URL
- `OLLAMA_API_KEY` - Ollama API key

### Frontend Required
- `VITE_API_URL` - Backend API URL

---

## 💰 Deployment Cost

**Railway:**
- Free trial: $5 credit
- After trial: $5-10/month
- Includes: Backend + MySQL + 8GB RAM

**Vercel:**
- Free tier: 100GB bandwidth
- Hobby: Free forever

**Total: $5-10/month**

---

## 📝 License

MIT License

---

## 🆘 Support

For issues or questions:
- Check Railway logs for backend errors
- Check Vercel logs for frontend errors
- Verify environment variables are set correctly

---

**Version:** 1.0.0  
**Last Updated:** May 6, 2026
