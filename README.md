# CourtPilot AI - Decision Intelligence Engine

**From Court Judgments to Verified Action Plans**

AI-powered system to convert court judgments into verified, trackable action plans with intelligent chat assistance for government officials.

---

## 🚀 Quick Start

### Backend Setup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys and database credentials

# 3. Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
# 1. Navigate to frontend
cd CourtPilotAI

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

### Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## ✨ Key Features

### 🤖 AI-Powered Processing
- Automated directive extraction from court judgments
- Department auto-assignment with confidence scoring
- RAG-based similar case analysis
- Intelligent chat assistant for officials

### 💬 Chat System
- Context-aware conversations about judgments
- Multi-turn chat with history
- Document Q&A with source attribution
- Quick queries and feedback system

### ⚖️ Judgment Processing
- PDF upload and OCR processing
- AI directive extraction
- Human verification workflow
- Compliance tracking and alerts

---

## 🎯 Core Workflows

### 1. Upload & Process Judgments
```bash
POST /api/v1/judgments/upload
```
Upload PDF → AI extracts directives → Assigns departments → Human verification

### 2. Chat with AI Assistant
```bash
POST /api/v1/chat/sessions
POST /api/v1/chat/sessions/{id}/messages
```
Ask questions → Get AI-powered answers → Context-aware responses

### 3. Verify & Track
```bash
POST /api/v1/verification/{id}/verify
GET /api/v1/tracking/lifecycle/{id}
```
Review extractions → Approve/Reject → Track compliance

---

## 📊 API Endpoints

- **Judgments**: Upload, process, list, status (8 endpoints)
- **Chat**: Sessions, messages, history, feedback (8 endpoints)
- **Verification**: Pending, verify, assign department (5 endpoints)
- **Tracking**: Lifecycle, timeline, audit trail (6 endpoints)
- **Action Plans**: Create, update, track progress (10 endpoints)
- **Alerts**: Active, critical, escalated items (8 endpoints)

**Full API Documentation**: http://localhost:8000/docs

---

## 🏗️ Architecture

```
Upload PDF → OCR/Extract → AI Processing → Extract Directives →
Assign Departments → Human Verify → Action Plans → Track Compliance
                                ↓
                    Chat Assistant for Officials
```

### Technology Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript + Vite
- **AI**: Ollama / OpenAI / Anthropic
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Vector Store**: FAISS
- **OCR**: Tesseract + PDF processing

---

## 🚢 Deployment

### Deploy to Vercel (Frontend)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Set Environment Variables** in Vercel Dashboard:
   - `VITE_API_URL`: Your backend API URL

### Deploy Backend

**Recommended platforms:**
- **Railway**: https://railway.app (easiest)
- **Render**: https://render.com (free tier available)
- **AWS Lambda**: For serverless deployment
- **DigitalOcean**: For VPS deployment

**Environment variables needed:**
- All variables from `.env.example`
- Set `DEBUG=False` for production
- Configure production database URL

---
