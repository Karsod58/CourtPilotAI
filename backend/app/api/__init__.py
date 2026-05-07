"""
API Router Configuration
"""
from fastapi import APIRouter

from app.api.v1 import (
    judgments,
    verification,
    actions,
    departments,
    tracking,
    alerts,
    analytics,
    chat,
    search,
    auth,
    deadlines,
    # rag,  # Disabled to save memory (350MB) - not needed for core features
)

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(judgments.router, prefix="/judgments", tags=["Judgments"])
api_router.include_router(verification.router, prefix="/verification", tags=["Verification"])
api_router.include_router(actions.router, prefix="/actions", tags=["Actions"])
api_router.include_router(deadlines.router, prefix="/deadlines", tags=["Deadlines"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["Tracking"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat Assistant"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
# api_router.include_router(rag.router, prefix="/rag", tags=["RAG System"])  # Disabled to save memory
