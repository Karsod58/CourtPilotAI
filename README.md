# CourtPilot AI - Legal Judgment Processing System

AI-powered system for processing court judgments, extracting directives, and managing compliance workflows.

---

## 📁 Project Structure

```
courtpilot/
├── backend/                    # Python FastAPI Backend
│   ├── app/                   # Application code
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Core configuration
│   │   ├── models/           # Database models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic
│   ├── data/                  # Data storage
│   │   ├── documents/        # Uploaded PDFs
│   │   └── vector_store/     # Vector embeddings
│   ├── logs/                  # Application logs
│   ├── .env                   # Backend environment variables
│   ├── requirements.txt       # Python dependencies
│   ├── Procfile              # Render deployment
│   └── render.yaml           # Render configuration
│
├── frontend/                   # React + TypeScript Frontend
│   ├── src/                   # Source code
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── styles/           # CSS styles
│   │   └── utils/            # Utility functions
│   ├── public/                # Static assets
│   ├── .env                   # Frontend environment variables
│   ├── package.json           # Node dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── vercel.json           # Vercel deployment
│
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
├── DEPLOYMENT.md              # Deployment instructions
└── start_full_stack.bat       # Local development script
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+ (or PostgreSQL/SQLite)
- Ollama (for AI features)

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Create database
python create_mysql_db.py

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend URL

# Run frontend
npm run dev
```

Frontend will be available at: **http://localhost:5173**

### 3. One-Command Start (Windows)

```bash
# From project root
start_full_stack.bat
```

This will start both backend and frontend automatically.

---

## 🔧 Configuration

### Backend Environment (.env)
```env
# Database
DATABASE_URL=mysql+aiomysql://user:password@localhost:3306/courtpilot

# AI Services
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:12b

# Security
SECRET_KEY=your-secret-key-here
```

### Frontend Environment (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## ✨ Features

### Core Features
- ✅ **PDF Upload & Processing** - Upload court judgments for AI analysis
- ✅ **AI Extraction** - Automatic extraction of directives, deadlines, departments
- ✅ **Human Verification** - Review and approve AI-extracted data
- ✅ **Action Plans** - Generate compliance action plans
- ✅ **Lifecycle Tracking** - Track judgment processing stages
- ✅ **Deadline Management** - Monitor upcoming and overdue deadlines
- ✅ **Analytics Dashboard** - View metrics and statistics
- ✅ **Global Search** - Search across judgments, directives, and action plans
- ✅ **AI Chat Assistant** - Ask questions about judgments with context
- ✅ **Document Downloads** - Download original PDFs

### AI-Powered Features
- 🤖 Automated directive extraction from court judgments
- 🎯 Department auto-assignment with confidence scoring
- 💬 Context-aware chat assistant for officials
- 📊 RAG-based similar case analysis
- 🔍 Intelligent search across all documents

---

## 🎯 Core Workflows

### 1. Upload & Process Judgments
```
Upload PDF → AI Processing → Extract Directives → 
Assign Departments → Human Verification → Action Plans → 
Track Compliance
```

### 2. Chat with AI Assistant
```
Create Session → Ask Questions → Get AI Answers → 
Context-Aware Responses → Source Attribution
```

### 3. Verify & Track
```
Review Extractions → Approve/Reject → Create Action Plans → 
Track Progress → Monitor Deadlines
```

---

## 📚 API Documentation

Once backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints
- **Judgments**: `/api/v1/judgments/` - Upload, process, list, download
- **Chat**: `/api/v1/chat/` - Sessions, messages, history
- **Verification**: `/api/v1/verification/` - Pending, verify, assign
- **Tracking**: `/api/v1/tracking/` - Lifecycle, timeline, audit
- **Action Plans**: `/api/v1/actions/` - Create, update, track
- **Deadlines**: `/api/v1/deadlines/` - Upcoming, overdue, statistics
- **Search**: `/api/v1/search/` - Global search across all data

---

## 🚢 Deployment

### Backend (Render)
1. Push code to GitHub
2. Connect Render to your repository
3. Render will use `backend/render.yaml` for configuration
4. Set environment variables in Render dashboard
5. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `frontend`
4. Vercel will use `frontend/vercel.json` for configuration
5. Set environment variables in Vercel dashboard
6. Deploy

**See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.**

---

## 🛠️ Development

### Backend Development
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 📖 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide for Render and Vercel
- **[PHASE_1_FIXES_COMPLETED.md](PHASE_1_FIXES_COMPLETED.md)** - Recent updates and fixes
- **API Docs** - http://localhost:8000/docs (when backend is running)

---

## 🏗️ Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MySQL / PostgreSQL / SQLite
- **AI**: Ollama (gemma3:12b) / OpenAI / Anthropic
- **Vector Store**: FAISS
- **OCR**: Tesseract + pdfplumber

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **Charts**: Recharts
- **Icons**: Lucide React
- **Styling**: CSS Modules

---

## 🎯 Roadmap

### Phase 2 (In Progress)
- [ ] Bulk operations for verification
- [ ] Compliance report generation
- [ ] Notifications system
- [ ] Enhanced action plan tracking

### Phase 3 (Planned)
- [ ] Mobile responsive design
- [ ] Advanced analytics and trends
- [ ] Multi-language support
- [ ] Role-based access control
- [ ] Audit trail enhancements

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

[Your License Here]

---

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
- Review [PHASE_1_FIXES_COMPLETED.md](PHASE_1_FIXES_COMPLETED.md) for recent updates
- Visit API documentation at http://localhost:8000/docs

---

## 📊 Project Status

**Current Version**: 1.0.0 (MVP)  
**Status**: ✅ Production Ready  
**Last Updated**: May 2026

### Recent Updates
- ✅ Dashboard now shows real-time data
- ✅ Global search implemented
- ✅ Document download functionality added
- ✅ Chat assistant with judgment context
- ✅ Lifecycle tracking enhanced
- ✅ Project structure reorganized for deployment

---

**Built with ❤️ using FastAPI, React, and AI**
