"""
Embedding Service - Handles text to vector conversion using Sentence Transformers
Optimized for Myanmar and English text processing
"""

import asyncio
import logging
import hashlib
from typing import List, Dict, Any, Optional, Union
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Advanced embedding service with Myanmar and English language support
    Uses multilingual sentence transformers for semantic understanding
    """
    
    def __init__(self, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_loaded = False
        self.embedding_dimension = 384  # Default dimension for MiniLM
        self.cache = {}
        self.stats = {
            "embeddings_generated": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "total_processing_time": 0,
            "model_load_time": 0
        }
        
    async def initialize(self) -> None:
        """Initialize the embedding model asynchronously"""
        logger.info(f"🔄 Initializing embedding model: {self.model_name}")
        start_time = time.time()
        
        try:
            # Load model in a thread to avoid blocking
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(
                None, 
                self._load_model
            )
            
            load_time = time.time() - start_time
            self.stats["model_load_time"] = load_time
            self.model_loaded = True
            
            logger.info(f"✅ Embedding model loaded successfully in {load_time:.2f}s")
            logger.info(f"📱 Using device: {self.device}")
            logger.info(f"📏 Embedding dimension: {self.embedding_dimension}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize embedding model: {e}")
            raise
    
    def _load_model(self) -> SentenceTransformer:
        """Load the sentence transformer model"""
        model = SentenceTransformer(self.model_name, device=self.device)
        
        # Get actual embedding dimension
        test_embedding = model.encode(["test"], show_progress_bar=False)
        self.embedding_dimension = test_embedding.shape[1]
        
        return model
    
    def is_ready(self) -> bool:
        """Check if the model is ready for use"""
        return self.model_loaded and self.model is not None
    
    def _generate_cache_key(self, text: str, model_version: str = None) -> str:
        """Generate a cache key for the embedding"""
        key_text = f"{text}_{model_version or self.model_name}"
        return hashlib.md5(key_text.encode()).hexdigest()
    
    @lru_cache(maxsize=1000)
    def _cached_encode(self, text: str) -> np.ndarray:
        """LRU cached encoding for frequently requested texts"""
        if not self.is_ready():
            raise RuntimeError("Embedding model not initialized")
        
        return self.model.encode(text, show_progress_bar=False)
    
    async def generate_embedding(
        self, 
        text: str, 
        model_version: str = None,
        use_cache: bool = True
    ) -> np.ndarray:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text to embed
            model_version: Model version (defaults to current model)
            use_cache: Whether to use caching
            
        Returns:
            numpy array containing the embedding vector
        """
        if not self.is_ready():
            raise RuntimeError("Embedding model not initialized")
        
        if not text or not text.strip():
            return np.zeros(self.embedding_dimension)
        
        # Clean and prepare text
        cleaned_text = self._prepare_text(text)
        
        # Check cache first
        cache_key = self._generate_cache_key(cleaned_text, model_version)
        if use_cache and cache_key in self.cache:
            self.stats["cache_hits"] += 1
            return self.cache[cache_key]
        
        self.stats["cache_misses"] += 1
        start_time = time.time()
        
        try:
            # Generate embedding in thread to avoid blocking
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                self._cached_encode,
                cleaned_text
            )
            
            processing_time = time.time() - start_time
            self.stats["total_processing_time"] += processing_time
            self.stats["embeddings_generated"] += 1
            
            # Cache the result
            if use_cache:
                self.cache[cache_key] = embedding
            
            logger.debug(f"Generated embedding for text (length: {len(cleaned_text)}) in {processing_time:.3f}s")
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    async def generate_batch_embeddings(
        self, 
        texts: List[str], 
        model_version: str = None,
        batch_size: int = 32,
        use_cache: bool = True
    ) -> List[np.ndarray]:
        """
        Generate embeddings for multiple texts efficiently
        
        Args:
            texts: List of input texts to embed
            model_version: Model version (defaults to current model)
            batch_size: Processing batch size for memory management
            use_cache: Whether to use caching
            
        Returns:
            List of numpy arrays containing embedding vectors
        """
        if not self.is_ready():
            raise RuntimeError("Embedding model not initialized")
        
        if not texts:
            return []
        
        # Clean and prepare all texts
        cleaned_texts = [self._prepare_text(text) for text in texts]
        embeddings = []
        
        # Check cache for each text
        cache_keys = [self._generate_cache_key(text, model_version) for text in cleaned_texts]
        texts_to_process = []
        text_indices = []
        
        for i, (text, cache_key) in enumerate(zip(cleaned_texts, cache_keys)):
            if use_cache and cache_key in self.cache:
                self.stats["cache_hits"] += 1
                embeddings.append((i, self.cache[cache_key]))
            else:
                self.stats["cache_misses"] += 1
                texts_to_process.append(text)
                text_indices.append(i)
        
        # Process remaining texts in batches
        if texts_to_process:
            start_time = time.time()
            
            try:
                # Process in batches to manage memory
                for i in range(0, len(texts_to_process), batch_size):
                    batch_texts = texts_to_process[i:i + batch_size]
                    batch_indices = text_indices[i:i + batch_size]
                    
                    # Generate embeddings in thread
                    loop = asyncio.get_event_loop()
                    batch_embeddings = await loop.run_in_executor(
                        None,
                        lambda: self.model.encode(batch_texts, show_progress_bar=False)
                    )
                    
                    # Store results and cache
                    for j, (embedding, original_index) in enumerate(zip(batch_embeddings, batch_indices)):
                        embeddings.append((original_index, embedding))
                        
                        if use_cache:
                            cache_key = cache_keys[original_index]
                            self.cache[cache_key] = embedding
                
                processing_time = time.time() - start_time
                self.stats["total_processing_time"] += processing_time
                self.stats["embeddings_generated"] += len(texts_to_process)
                
                logger.info(f"Generated {len(texts_to_process)} embeddings in {processing_time:.2f}s")
                
            except Exception as e:
                logger.error(f"Failed to generate batch embeddings: {e}")
                raise
        
        # Sort embeddings by original index and return
        embeddings.sort(key=lambda x: x[0])
        return [emb for _, emb in embeddings]
    
    def _prepare_text(self, text: str) -> str:
        """
        Prepare text for embedding generation
        Handles Myanmar and English text preprocessing
        """
        if not text:
            return ""
        
        # Basic cleaning
        cleaned = text.strip()
        
        # Handle Myanmar text specifics
        # Myanmar Unicode normalization if needed
        try:
            import unicodedata
            cleaned = unicodedata.normalize('NFC', cleaned)
        except:
            pass  # If unicodedata not available, continue without normalization
        
        # Remove excessive whitespace
        cleaned = ' '.join(cleaned.split())
        
        return cleaned
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        return {
            "model_name": self.model_name,
            "device": self.device,
            "embedding_dimension": self.embedding_dimension,
            "model_loaded": self.model_loaded,
            "cache_size": len(self.cache),
            "stats": self.stats.copy()
        }
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this model"""
        return self.embedding_dimension
    
    def clear_cache(self) -> None:
        """Clear the embedding cache"""
        self.cache.clear()
        self._cached_encode.cache_clear()
        logger.info("🧹 Embedding cache cleared")
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        logger.info("🧹 Cleaning up embedding service...")
        self.clear_cache()
        
        if self.model:
            # Clear GPU memory if using CUDA
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        self.model = None
        self.model_loaded = False
    
    # Utility methods for specific use cases
    async def generate_book_embedding(self, book_data: Dict[str, Any]) -> np.ndarray:
        """
        Generate embedding specifically for book data
        Combines multiple book fields for rich representation
        """
        # Combine book fields for comprehensive embedding
        text_parts = []
        
        if book_data.get('name'):
            text_parts.append(f"Title: {book_data['name']}")
        
        if book_data.get('author'):
            text_parts.append(f"Author: {book_data['author']}")
        
        if book_data.get('description'):
            text_parts.append(f"Description: {book_data['description']}")
        
        if book_data.get('category'):
            text_parts.append(f"Category: {book_data['category']}")
        
        if book_data.get('tags') and isinstance(book_data['tags'], list):
            tags_str = ', '.join(book_data['tags'])
            text_parts.append(f"Tags: {tags_str}")
        
        # Combine all parts
        combined_text = '. '.join(text_parts)
        
        return await self.generate_embedding(combined_text)
    
    async def generate_user_preference_embedding(
        self, 
        user_interactions: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Generate embedding representing user preferences
        Based on their interaction history
        """
        if not user_interactions:
            return np.zeros(self.embedding_dimension)
        
        # Collect text from books the user liked/purchased
        preference_texts = []
        
        for interaction in user_interactions:
            book = interaction.get('book', {})
            interaction_type = interaction.get('interaction_type', '')
            
            # Weight positive interactions more heavily
            weight = 1
            if interaction_type in ['purchase', 'like', 'bookmark']:
                weight = 2
            elif interaction_type in ['view', 'click']:
                weight = 0.5
            
            if book.get('name'):
                # Add weighted representation
                for _ in range(weight):
                    text_parts = []
                    if book.get('name'):
                        text_parts.append(book['name'])
                    if book.get('category'):
                        text_parts.append(book['category'])
                    if book.get('tags'):
                        text_parts.extend(book['tags'][:3])  # Top 3 tags
                    
                    if text_parts:
                        preference_texts.append(' '.join(text_parts))
        
        if not preference_texts:
            return np.zeros(self.embedding_dimension)
        
        # Generate embeddings for all preference texts
        preference_embeddings = await self.generate_batch_embeddings(preference_texts)
        
        # Average the embeddings to create user preference vector
        if preference_embeddings:
            user_embedding = np.mean(preference_embeddings, axis=0)
            return user_embedding
        
        return np.zeros(self.embedding_dimension)