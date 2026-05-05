"""
Vector Store for RAG Pipeline
Manages vector embeddings and similarity search using FAISS
"""
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
import numpy as np
import json
import os
from pathlib import Path

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.warning("FAISS not available - RAG features will be limited")


class VectorStore:
    """
    Vector store for storing and searching document embeddings
    """
    
    def __init__(self, dimension: int = 384, index_path: str = "./data/vector_index"):
        """
        Initialize vector store
        
        Args:
            dimension: Dimension of embeddings
            index_path: Path to store the FAISS index
        """
        self.dimension = dimension
        self.index_path = Path(index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)
        
        self.index = None
        self.metadata = []  # Store metadata for each vector
        self.id_to_idx = {}  # Map document IDs to index positions
        
        if FAISS_AVAILABLE:
            self._initialize_index()
        else:
            logger.warning("FAISS not available - using in-memory fallback")
            self.vectors = []
    
    def _initialize_index(self):
        """Initialize or load FAISS index"""
        index_file = self.index_path / "faiss.index"
        metadata_file = self.index_path / "metadata.json"
        
        if index_file.exists() and metadata_file.exists():
            try:
                self.index = faiss.read_index(str(index_file))
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    self.metadata = data['metadata']
                    self.id_to_idx = data['id_to_idx']
                logger.info(f"Loaded existing index with {len(self.metadata)} vectors")
            except Exception as e:
                logger.error(f"Error loading index: {e}")
                self._create_new_index()
        else:
            self._create_new_index()
    
    def _create_new_index(self):
        """Create a new FAISS index"""
        if FAISS_AVAILABLE:
            # Use IndexFlatL2 for exact search (can be changed to IndexIVFFlat for large datasets)
            self.index = faiss.IndexFlatL2(self.dimension)
            logger.info(f"Created new FAISS index (dimension={self.dimension})")
        self.metadata = []
        self.id_to_idx = {}
    
    def add(self, doc_id: str, embedding: np.ndarray, metadata: Dict[str, Any]):
        """
        Add a document embedding to the store
        
        Args:
            doc_id: Unique document ID
            embedding: Document embedding vector
            metadata: Document metadata (text, type, etc.)
        """
        if doc_id in self.id_to_idx:
            logger.warning(f"Document {doc_id} already exists, skipping")
            return
        
        # Ensure embedding is 2D
        if len(embedding.shape) == 1:
            embedding = embedding.reshape(1, -1)
        
        if FAISS_AVAILABLE and self.index is not None:
            self.index.add(embedding.astype(np.float32))
        else:
            self.vectors.append(embedding)
        
        idx = len(self.metadata)
        self.metadata.append({
            'id': doc_id,
            **metadata
        })
        self.id_to_idx[doc_id] = idx
    
    def add_batch(self, doc_ids: List[str], embeddings: np.ndarray, metadata_list: List[Dict[str, Any]]):
        """
        Add multiple document embeddings at once
        
        Args:
            doc_ids: List of document IDs
            embeddings: Batch of embeddings (n_docs x dimension)
            metadata_list: List of metadata dicts
        """
        for doc_id, embedding, metadata in zip(doc_ids, embeddings, metadata_list):
            self.add(doc_id, embedding, metadata)
    
    def search(self, query_embedding: np.ndarray, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for similar documents
        
        Args:
            query_embedding: Query embedding vector
            k: Number of results to return
            
        Returns:
            List of matching documents with scores
        """
        if len(self.metadata) == 0:
            return []
        
        # Ensure query is 2D
        if len(query_embedding.shape) == 1:
            query_embedding = query_embedding.reshape(1, -1)
        
        k = min(k, len(self.metadata))
        
        if FAISS_AVAILABLE and self.index is not None:
            distances, indices = self.index.search(query_embedding.astype(np.float32), k)
            
            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx < len(self.metadata):
                    results.append({
                        **self.metadata[idx],
                        'score': float(1 / (1 + dist))  # Convert distance to similarity score
                    })
            return results
        else:
            # Fallback: cosine similarity
            if not self.vectors:
                return []
            
            vectors = np.vstack(self.vectors)
            # Normalize vectors
            query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
            vectors_norm = vectors / (np.linalg.norm(vectors, axis=1, keepdims=True) + 1e-8)
            
            # Compute cosine similarity
            similarities = np.dot(vectors_norm, query_norm.T).flatten()
            
            # Get top k
            top_k_idx = np.argsort(similarities)[-k:][::-1]
            
            results = []
            for idx in top_k_idx:
                results.append({
                    **self.metadata[idx],
                    'score': float(similarities[idx])
                })
            return results
    
    def save(self):
        """Save the index and metadata to disk"""
        if FAISS_AVAILABLE and self.index is not None:
            try:
                index_file = self.index_path / "faiss.index"
                metadata_file = self.index_path / "metadata.json"
                
                faiss.write_index(self.index, str(index_file))
                
                with open(metadata_file, 'w') as f:
                    json.dump({
                        'metadata': self.metadata,
                        'id_to_idx': self.id_to_idx
                    }, f)
                
                logger.info(f"Saved index with {len(self.metadata)} vectors")
            except Exception as e:
                logger.error(f"Error saving index: {e}")
    
    def clear(self):
        """Clear the index"""
        self._create_new_index()
        logger.info("Cleared vector store")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store"""
        return {
            'total_vectors': len(self.metadata),
            'dimension': self.dimension,
            'index_type': 'FAISS' if FAISS_AVAILABLE else 'In-Memory'
        }


# Global vector store instance
vector_store = VectorStore()
