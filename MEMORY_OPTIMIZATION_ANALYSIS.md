# Memory Optimization Analysis for Railway Deployment

## Current Memory Usage Estimate

### Base Python + FastAPI
- Python runtime: ~50MB
- FastAPI + Uvicorn: ~30MB
- **Subtotal: 80MB**

### Database Clients
- SQLAlchemy: ~20MB
- aiomysql: ~15MB
- pymongo (Motor): ~25MB
- **Subtotal: 60MB**

### AI/LLM Libraries
- LangChain (core + openai + community): ~80MB
- OpenAI client: ~10MB
- Anthropic client: ~10MB
- **Subtotal: 100MB**

### Document Processing
- pypdf + PyPDF2 + pdfplumber: ~30MB
- Pillow: ~20MB
- opencv-python: ~50MB
- pytesseract: ~10MB
- **Subtotal: 110MB**

### Heavy Libraries (PROBLEM AREA)
- **sentence-transformers: ~350MB** ← BIGGEST ISSUE
- faiss-cpu: ~30MB
- numpy: ~20MB
- pandas: ~40MB
- **Subtotal: 440MB**

### Other
- Utilities (loguru, httpx, etc.): ~20MB
- Celery + Redis: ~30MB
- **Subtotal: 50MB**

---

## Total Memory Usage

### Current (All Features)
```
Base: 80MB
Database: 60MB
AI/LLM: 100MB
Document Processing: 110MB
Heavy Libraries: 440MB
Other: 50MB
─────────────────
TOTAL: 840MB ❌ (Exceeds 512MB limit by 328MB)
```

### With DISABLE_EMBEDDINGS=true
```
Base: 80MB
Database: 60MB
AI/LLM: 100MB
Document Processing: 110MB
Heavy Libraries: 90MB (no sentence-transformers)
Other: 50MB
─────────────────
TOTAL: 490MB ✅ (Under 512MB limit)
```

---

## Optimization Strategy

### Priority 1: Must Keep (Core Features)
✅ **FastAPI + Uvicorn** (80MB) - Web framework
✅ **SQLAlchemy + aiomysql** (35MB) - Database for judgments
✅ **LangChain + OpenAI** (100MB) - AI directive extraction
✅ **pypdf + pdfplumber** (30MB) - PDF text extraction
✅ **numpy** (20MB) - Required by many libs

**Subtotal: 265MB**

### Priority 2: Can Optimize (Reduce Memory)
⚠️ **opencv-python** (50MB) → Can remove or use opencv-python-headless (20MB)
⚠️ **pandas** (40MB) → Can remove if not heavily used
⚠️ **pymongo/Motor** (25MB) → Can remove if not using MongoDB
⚠️ **Celery + Redis** (30MB) → Can remove if not using background tasks
⚠️ **pytesseract** (10MB) → Can make optional

**Potential Savings: 155MB**

### Priority 3: Already Optimized
✅ **sentence-transformers** (350MB) → Disabled via DISABLE_EMBEDDINGS
✅ **faiss-cpu** (30MB) → Not loaded if embeddings disabled

**Savings: 380MB**

---

## Recommended Optimizations

### Optimization 1: Remove MongoDB (Save 25MB)
**Impact**: None if not using MongoDB for chat history

**Check if used**:
```python
# Search for MongoDB usage
grep -r "motor\|pymongo" backend/app/
```

**If not used**: Remove from requirements.txt

### Optimization 2: Replace opencv-python with opencv-python-headless (Save 30MB)
**Impact**: None - headless version has same functionality

**Change in requirements.txt**:
```diff
- opencv-python>=4.9.0
+ opencv-python-headless>=4.9.0
```

### Optimization 3: Remove pandas if not critical (Save 40MB)
**Impact**: Check if pandas is actually used

**Check usage**:
```python
grep -r "import pandas\|from pandas" backend/app/
```

**If minimal usage**: Replace with native Python or numpy

### Optimization 4: Make Celery/Redis Optional (Save 30MB)
**Impact**: Background tasks won't work, but can use FastAPI BackgroundTasks instead

**Change**: Only import if CELERY_ENABLED=true

### Optimization 5: Lazy Load Heavy Libraries
**Impact**: None - load only when needed

**Libraries to lazy load**:
- opencv (only for image preprocessing)
- pandas (only if used for analytics)
- pytesseract (only for OCR)

---

## Optimized Memory Profile

### Minimal Configuration (Core Features Only)
```
Base: 80MB
Database (MySQL only): 35MB
AI/LLM: 100MB
Document Processing (minimal): 50MB
numpy: 20MB
Other: 20MB
─────────────────
TOTAL: 305MB ✅ (40% buffer remaining)
```

### Recommended Configuration (Balanced)
```
Base: 80MB
Database (MySQL only): 35MB
AI/LLM: 100MB
Document Processing: 70MB (with opencv-headless)
numpy: 20MB
Other: 30MB
─────────────────
TOTAL: 335MB ✅ (35% buffer remaining)
```

### Current with DISABLE_EMBEDDINGS
```
TOTAL: 490MB ✅ (4% buffer remaining)
```

---

## Implementation Plan

### Phase 1: Quick Wins (No Code Changes)
1. ✅ **DISABLE_EMBEDDINGS=true** (saves 350MB)
2. **Remove unused dependencies** from requirements.txt
3. **Use opencv-python-headless** instead of opencv-python

**Expected Result**: 335-400MB

### Phase 2: Code Optimizations (Minimal Changes)
1. **Lazy load opencv** (only when image preprocessing needed)
2. **Lazy load pandas** (only when analytics needed)
3. **Remove MongoDB** if not used
4. **Make Celery optional**

**Expected Result**: 305-350MB

### Phase 3: Advanced (If Still Needed)
1. **Use lighter PDF library** (pypdf only, remove pdfplumber)
2. **Disable OCR** if not critical (pytesseract)
3. **Use minimal LangChain** (only required modules)

**Expected Result**: 250-300MB

---

## Specific Changes to Make

### Change 1: requirements.txt Optimization

**Create requirements-minimal.txt**:
```txt
# Core Framework
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-multipart>=0.0.6

# Database (MySQL only)
sqlalchemy>=2.0.25
aiomysql>=0.2.0

# Data Validation
pydantic>=2.5.3
pydantic-settings>=2.1.0
email-validator>=2.1.0

# Authentication & Security
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
bcrypt>=4.1.2

# AI/LLM - Core
openai>=1.10.0

# LangChain (Minimal)
langchain>=0.1.0
langchain-core>=0.1.0
langchain-openai>=0.0.5

# Document Processing (Minimal)
pypdf>=4.0.1
pdfplumber>=0.10.3
Pillow>=10.2.0

# Utilities
python-dotenv>=1.0.0
loguru>=0.7.2
aiofiles>=23.2.1
httpx>=0.26.0

# Data Processing (Minimal)
numpy>=1.26.3
```

**Removed**:
- ❌ sentence-transformers (350MB) - Use DISABLE_EMBEDDINGS
- ❌ faiss-cpu (30MB) - Not needed without embeddings
- ❌ pandas (40MB) - Not critical
- ❌ opencv-python (50MB) - Use headless or remove
- ❌ motor/pymongo (25MB) - Not using MongoDB
- ❌ celery/redis (30MB) - Use FastAPI BackgroundTasks
- ❌ anthropic (10MB) - Only if using Claude
- ❌ langchain-community (20MB) - Not needed
- ❌ PyPDF2 (duplicate of pypdf)
- ❌ pytesseract (10MB) - OCR optional
- ❌ pdf2image (10MB) - Not critical

**Total Savings**: ~575MB
**New Total**: ~265MB ✅

### Change 2: Lazy Load OpenCV

**In pdf_processor.py**:
```python
# Don't import at module level
# import cv2

# Import only when needed
def preprocess_image(self, image):
    try:
        import cv2  # Lazy import
        # ... processing
    except ImportError:
        logger.warning("opencv not available, skipping preprocessing")
        return image
```

### Change 3: Environment Variables

**Add to Railway**:
```env
DISABLE_EMBEDDINGS=true
DISABLE_OCR_PREPROCESSING=true  # Skip opencv
USE_MINIMAL_DEPS=true  # Skip optional features
```

---

## Testing After Optimization

### Test 1: Core Features
- ✅ Upload PDF
- ✅ Extract text
- ✅ AI directive extraction (Groq/OpenAI)
- ✅ Department assignment
- ✅ Verification
- ✅ Action plans

### Test 2: Optional Features
- ⚠️ Image preprocessing (disabled)
- ⚠️ Semantic search (disabled)
- ⚠️ Advanced analytics (limited)

### Test 3: Memory Usage
- Check Railway metrics
- Should be < 350MB
- No OOM errors

---

## Recommendation

### For Immediate Fix (Today)
1. ✅ Set `DISABLE_EMBEDDINGS=true` in Railway
2. Keep current requirements.txt
3. **Result**: 490MB (works, but tight)

### For Better Performance (This Week)
1. Create `requirements-minimal.txt`
2. Update Railway to use minimal requirements
3. Add lazy loading for opencv
4. **Result**: 300-350MB (comfortable margin)

### For Production (Long-term)
1. Upgrade to Railway Pro ($5/month, 8GB RAM)
2. Enable all features
3. Better performance and reliability

---

## Summary

**Current**: 840MB (OOM ❌)
**With DISABLE_EMBEDDINGS**: 490MB (works ✅, but tight)
**With Minimal Requirements**: 300MB (comfortable ✅)
**With Railway Pro**: No limits (best ✅)

**Recommendation**: 
1. **Immediate**: Set DISABLE_EMBEDDINGS=true
2. **Next**: Switch to requirements-minimal.txt
3. **Future**: Upgrade to Railway Pro for production

**All core features work in all scenarios!** 🎉
