"""
RAG (Retrieval-Augmented Generation) API endpoints
Manage vector indexing and context retrieval
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.services.rag.retriever import context_retriever
from app.services.rag.vector_store import vector_store
from app.services.rag.embeddings import embedding_service

router = APIRouter()


@router.post("/index/rebuild")
async def rebuild_index(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Rebuild the entire RAG index
    
    This will index all judgments and directives in the database.
    The operation runs in the background.
    """
    try:
        # Run indexing in background
        background_tasks.add_task(context_retriever.index_all_judgments, db)
        
        return {
            "message": "Index rebuild started in background",
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Error starting index rebuild: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/clear")
async def clear_index():
    """
    Clear the RAG index
    
    This will remove all vectors from the index.
    """
    try:
        vector_store.clear()
        
        return {
            "message": "Index cleared successfully",
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error clearing index: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_rag_stats():
    """
    Get RAG system statistics
    
    Returns information about the vector store and embedding service.
    """
    try:
        stats = context_retriever.get_stats()
        
        return {
            "status": "operational",
            **stats
        }
        
    except Exception as e:
        logger.error(f"Error getting RAG stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_context(
    query: str,
    k: int = 5,
    filter_type: str = None
):
    """
    Search for relevant context using RAG
    
    Args:
        query: Search query
        k: Number of results to return
        filter_type: Optional filter by type ('judgment' or 'directive')
    
    Returns:
        List of relevant documents
    """
    try:
        results = context_retriever.retrieve_context(query, k=k, filter_type=filter_type)
        
        return {
            "query": query,
            "total_results": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error searching context: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def rag_health_check():
    """
    Check RAG system health
    
    Returns status of embedding service and vector store.
    """
    try:
        stats = vector_store.get_stats()
        
        health = {
            "status": "healthy",
            "embedding_service": {
                "available": embedding_service.model is not None,
                "model": embedding_service.model_name,
                "dimension": embedding_service.embedding_dim
            },
            "vector_store": {
                "total_vectors": stats['total_vectors'],
                "index_type": stats['index_type']
            }
        }
        
        return health
        
    except Exception as e:
        logger.error(f"Error checking RAG health: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
