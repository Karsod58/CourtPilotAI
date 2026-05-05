# 🚀 Get Started with CourtPilot - Right Now!

## Overview

CourtPilot uses **Ollama AI** (free, open-source) for intelligent document processing and includes a **Chat UI** for officials to query judgments and get instant answers.

## 5-Minute Quick Start

### Step 1: Install System Requirements (2 minutes)

**Windows:**
```powershell
# Install Tesseract OCR
# Download: https://github.com/UB-Mannheim/tesseract/wiki
# Run installer and add to PATH

# Install Poppler
# Download: https://github.com/oschwartz10612/poppler-windows/releases
# Extract and add bin folder to PATH
```

**Linux:**
```bash
sudo apt-get update && sudo apt-get install -y tesseract-ocr poppler-utils postgresql
```

**macOS:**
```bash
brew install tesseract poppler postgresql
brew services start postgresql
```

### Step 2: Setup Python Environment (1 minute)

```bash
# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment (1 minute)

```bash
# Copy environment template
cp .env.example .env
```

**Edit .env file - ONLY these 2 lines are required:**
```env
POSTGRES_PASSWORD=your_password
OPENAI_API_KEY=sk-your-key-here
```

### Step 4: Setup Database (30 seconds)

```bash
# Create database
createdb courtpilot

# That's it! Tables will be created automatically
```

### Step 5: Start the Server (30 seconds)

```bash
uvicorn app.main:app --reload
```

**You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Step 6: Verify It Works (30 seconds)

Open browser: http://localhost:8000/docs

You should see the Swagger UI with all API endpoints!

---

## Your First API Call

### Test 1: Health Check
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "app": "CourtPilot",
  "version": "1.0.0"
}
```

### Test 2: Upload a Judgment

**Create a test PDF first** (or use any PDF):
```
HIGH COURT OF MADHYA PRADESH
Case No: HC/2024/1234

ORDER

1. The respondent shall release the pension amount within 30 days.
2. The Finance Department shall ensure compliance.
3. A compliance report shall be submitted within 45 days.

Dated: 2024-05-01
(Justice ABC)
```

**Upload via Swagger UI:**
1. Go to http://localhost:8000/docs
2. Find `POST /api/v1/judgments/upload`
3. Click "Try it out"
4. Fill in:
   - file: Upload your PDF
   - case_id: HC/2024/1234
   - case_type: civil
   - court_name: High Court of MP
5. Click "Execute"

**Or via curl:**
```bash
curl -X POST "http://localhost:8000/api/v1/judgments/upload" \
  -F "file=@test_judgment.pdf" \
  -F "case_id=HC/2024/1234" \
  -F "case_type=civil" \
  -F "court_name=High Court of MP" \
  -F "judge_name=Justice ABC"
```

### Test 3: Check Processing Status

Copy the `id` from the upload response, then:

```bash
curl http://localhost:8000/api/v1/judgments/{id}/status
```

### Test 4: View Extracted Directives

```bash
curl http://localhost:8000/api/v1/judgments/{id}/directives
```

You should see AI-extracted directives with:
- Directive text
- Confidence scores
- Assigned departments
- Deadlines
- Priority levels

---

## Understanding the Workflow

### 1. Upload Phase
```
User uploads PDF → Server saves file → Returns judgment ID
```

### 2. Processing Phase (Automatic)
```
PDF → OCR/Extract Text → AI Analysis → Extract Directives → 
Assign Departments → Save to Database
```

### 3. Verification Phase
```
Human reviews directives → Approve/Edit/Reject → 
Verified directives ready for action
```

### 4. Action Phase (To be implemented)
```
Generate action plans → Assign officers → Track progress → 
Monitor deadlines → Send alerts
```

---

## Key Files to Know

### Configuration
- `.env` - Your environment variables
- `app/core/config.py` - Configuration management

### Models (Database)
- `app/models/judgment.py` - Judgment data model
- `app/models/directive.py` - Directive data model
- `app/models/action_plan.py` - Action plan model

### Services (Business Logic)
- `app/services/judgment_service.py` - Main judgment processing
- `app/services/ai/llm_service.py` - AI/LLM integration
- `app/services/ocr/pdf_processor.py` - PDF processing

### API Endpoints
- `app/api/v1/judgments.py` - Judgment endpoints
- `app/api/v1/verification.py` - Verification endpoints

---

## Common Tasks

### View All Judgments
```bash
curl http://localhost:8000/api/v1/judgments/
```

### Get Pending Verifications
```bash
curl http://localhost:8000/api/v1/verification/pending
```

### Approve a Directive
```bash
curl -X POST "http://localhost:8000/api/v1/verification/{directive_id}/approve?verified_by=officer1"
```

### Check Database
```bash
psql -U postgres -d courtpilot

# List tables
\dt

# View judgments
SELECT id, case_id, status FROM judgments;

# View directives
SELECT id, directive_text, confidence_score FROM directives;
```

---

## Troubleshooting

### "Tesseract not found"
```bash
# Windows: Add to PATH or set in .env
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe

# Linux/macOS: Install
sudo apt-get install tesseract-ocr  # Linux
brew install tesseract  # macOS
```

### "Database connection failed"
```bash
# Check PostgreSQL is running
# Windows: Check Services
# Linux: sudo systemctl status postgresql
# macOS: brew services list

# Create database if missing
createdb courtpilot
```

### "OpenAI API error"
```bash
# Check API key in .env
OPENAI_API_KEY=sk-your-actual-key-here

# Verify key works
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### "Module not found"
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Or install specific package
pip install fastapi uvicorn sqlalchemy
```

---

## Next Steps

### 1. Explore the API (10 minutes)
- Open http://localhost:8000/docs
- Try each endpoint
- Upload a real judgment PDF
- View extracted directives

### 2. Understand the Code (30 minutes)
- Read `app/services/judgment_service.py`
- Check `app/services/ai/llm_service.py`
- Review `app/api/v1/judgments.py`

### 3. Customize (1 hour)
- Edit department mappings
- Adjust AI prompts in `llm_service.py`
- Modify confidence thresholds in `.env`

### 4. Implement Phase 2 (Next)
- Action plan generation
- Officer assignment
- Tracking system
- Alert engine

---

## Development Workflow

### 1. Make Changes
Edit files in `app/` directory

### 2. Server Auto-Reloads
Changes are detected automatically (--reload flag)

### 3. Test Changes
Use Swagger UI or curl to test

### 4. Check Logs
```bash
tail -f logs/courtpilot.log
```

### 5. Debug
Add print statements or use debugger:
```python
from loguru import logger
logger.debug(f"Debug info: {variable}")
```

---

## Quick Reference

### Start Server
```bash
uvicorn app.main:app --reload
```

### Run Tests
```bash
python test_api.py
```

### Database Shell
```bash
psql -U postgres -d courtpilot
```

### View Logs
```bash
tail -f logs/courtpilot.log
```

### API Documentation
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## What You Have Now

✅ **Complete Backend Infrastructure**
- FastAPI server with async support
- PostgreSQL database with models
- AI integration (OpenAI/Anthropic)
- PDF processing with OCR
- Directive extraction
- Department assignment
- Verification workflow

✅ **Working API Endpoints**
- Upload judgments
- Process with AI
- Extract directives
- Verify directives
- List and filter data

✅ **Documentation**
- API docs (Swagger)
- README
- Quick start guide
- Implementation plan

---

## What to Build Next

🚧 **Phase 2: Action Planning**
- Generate action plans from directives
- Assign to specific officers
- Create timelines and milestones
- Compliance checklists

🚧 **Phase 3: Tracking & Alerts**
- Track action progress
- Monitor deadlines
- Send alerts
- Escalation workflows

🚧 **Phase 4: Intelligence**
- RAG for similar cases
- Appeal recommendations
- Semantic search
- Analytics dashboard

---

## Tips for Success

### 1. Start Small
- Test with simple PDFs first
- Verify each step works
- Build incrementally

### 2. Use the Docs
- Swagger UI is your friend
- Check IMPLEMENTATION_PLAN.md
- Read code comments

### 3. Debug Effectively
- Check logs first
- Use Swagger UI to test
- Print/log liberally

### 4. Ask for Help
- Check error messages
- Review documentation
- Test in isolation

---

## Success Checklist

- [ ] Server starts without errors
- [ ] Health check returns "healthy"
- [ ] Can upload a PDF
- [ ] Processing completes successfully
- [ ] Directives are extracted
- [ ] Can view directives in API
- [ ] Verification endpoints work
- [ ] Database has data

**If all checked, you're ready to build! 🎉**

---

## Resources

### Documentation
- `README.md` - Full project documentation
- `QUICKSTART.md` - Detailed setup guide
- `IMPLEMENTATION_PLAN.md` - Architecture details
- `IMPLEMENTATION_SUMMARY.md` - What's implemented

### Code
- `app/` - All application code
- `test_api.py` - Test script
- `.env.example` - Configuration template

### External
- FastAPI: https://fastapi.tiangolo.com
- LangChain: https://python.langchain.com
- SQLAlchemy: https://www.sqlalchemy.org

---

**You're all set! Start building! 🚀**

**Team NyayaSaar** | PanIIT Bangalore Hackathon
**JUSTICE • CLARITY • ACCOUNTABILITY**
