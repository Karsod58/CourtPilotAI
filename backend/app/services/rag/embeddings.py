"""
Embedding Service for RAG Pipeline
Generates vector embeddings for text using sentence-transformers
"""
from typing import List, Optional
from loguru import logger
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("sentence-transformers not available - RAG features will be limited")


class EmbeddingService:
    """
    Service for generating text embeddings with lazy loading
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embedding service (lazy loading - model loaded on first use)
        
        Args:
            model_name: Name of the sentence-transformers model to use
        """
        self.model_name = model_name
        self.model = None
        self.embedding_dim = 384  # Default for all-MiniLM-L6-v2
        self._model_loaded = False
        
    def _load_model(self):
        """Lazy load the model only when needed"""
        if self._model_loaded:
            return
            
        self._model_loaded = True
        
        # Check if embeddings are disabled via environment variable
        import os
        if os.getenv('DISABLE_EMBEDDINGS', 'false').lower() == 'true':
            logger.info("Embeddings disabled via DISABLE_EMBEDDINGS environment variable")
            self.model = None
            return
        
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning("Sentence transformers not available - using fallback embeddings")
            return
            
        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.embedding_dim = self.model.get_sentence_embedding_dimension()
            logger.info(f"Embedding model loaded successfully (dim={self.embedding_dim})")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.model = None
    
    def encode(self, texts: List[str], batch_size: int = 32) -> Optional[np.ndarray]:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to embed
            batch_size: Batch size for encoding
            
        Returns:
            numpy array of embeddings or None if model not available
        """
        if not texts:
            return None
        
        # Lazy load model on first use
        self._load_model()
        
        if self.model is None:
            # Fallback: return random embeddings (for development)
            logger.warning("Using random embeddings - install sentence-transformers for real embeddings")
            return np.random.rand(len(texts), self.embedding_dim).astype(np.float32)
        
        try:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return None
    
    def encode_single(self, text: str) -> Optional[np.ndarray]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text string to embed
            
        Returns:
            numpy array embedding or None if model not available
        """
        result = self.encode([text])
        return result[0] if result is not None else None
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings"""
        return self.embedding_dim


# Global embedding service instance
embedding_service = EmbeddingService()
