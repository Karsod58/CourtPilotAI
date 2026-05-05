"""
CourtPilot - Simplified Demo Version
Main application entry point (without full dependencies)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

# Simple configuration
class SimpleSettings:
    APP_NAME = "CourtPilot"
    APP_VERSION = "1.0.0"
    ENVIRONMENT = "development"
    DEBUG = True
    CORS_ORIGINS = ["*"]

settings = SimpleSettings()

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered system to convert court judgments into verified, trackable action plans",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "message": "CourtPilot is running! (Simplified demo version)"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "CourtPilot - Decision Intelligence Engine",
        "tagline": "From Court Judgments to Verified Action Plans",
        "values": ["JUSTICE", "CLARITY", "ACCOUNTABILITY"],
        "docs": "/docs",
        "health": "/health",
        "note": "This is a simplified demo version. Install full dependencies for complete functionality."
    }

# Demo chat endpoint
@app.post("/api/v1/chat/demo")
async def demo_chat(message: dict):
    """Demo chat endpoint"""
    return {
        "question": message.get("message", ""),
        "answer": "This is a demo response. Install Ollama dependencies to enable full AI chat functionality.",
        "note": "Full chat system requires: langchain, ollama, and other AI dependencies"
    }

# Demo judgment upload
@app.post("/api/v1/judgments/demo")
async def demo_upload():
    """Demo upload endpoint"""
    return {
        "message": "Demo endpoint - judgment upload would happen here",
        "note": "Full functionality requires: PDF processing, OCR, and AI extraction dependencies"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
