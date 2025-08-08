"""
AI-Powered Book Recommendation System - FastAPI Service
Handles embedding generation and similarity calculations for Myanmar Book Publishing Platform
"""

import os
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

from services.embedding_service import EmbeddingService
from services.text_processor import TextProcessor
from services.similarity_engine import SimilarityEngine
from services.recommendation_engine import RecommendationEngine
from models.book_model import BookData, BookEmbedding
from models.recommendation_model import RecommendationRequest, RecommendationResponse
from utils.logger import setup_logger
from utils.cache import CacheManager

# Setup logging
logger = setup_logger(__name__)

# Global services (will be initialized in lifespan)
embedding_service: Optional[EmbeddingService] = None
text_processor: Optional[TextProcessor] = None
similarity_engine: Optional[SimilarityEngine] = None
recommendation_engine: Optional[RecommendationEngine] = None
cache_manager: Optional[CacheManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup services"""
    global embedding_service, text_processor, similarity_engine, recommendation_engine, cache_manager
    
    try:
        # Initialize services
        logger.info("🚀 Initializing AI Recommendation Services...")
        
        embedding_service = EmbeddingService()
        await embedding_service.initialize()
        
        text_processor = TextProcessor()
        similarity_engine = SimilarityEngine()
        cache_manager = CacheManager()
        
        recommendation_engine = RecommendationEngine(
            embedding_service=embedding_service,
            text_processor=text_processor,
            similarity_engine=similarity_engine,
            cache_manager=cache_manager
        )
        
        logger.info("✅ All services initialized successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("🧹 Cleaning up services...")
    if embedding_service:
        await embedding_service.cleanup()

# Create FastAPI app with lifespan management
app = FastAPI(
    title="Myanmar Book Recommendation AI Service",
    description="Advanced AI-powered book recommendation system with multilingual support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        model_status = embedding_service.is_ready() if embedding_service else False
        return {
            "status": "healthy" if model_status else "initializing",
            "model_ready": model_status,
            "version": "1.0.0",
            "services": {
                "embedding_service": embedding_service is not None,
                "text_processor": text_processor is not None,
                "similarity_engine": similarity_engine is not None,
                "recommendation_engine": recommendation_engine is not None,
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

# Pydantic models for API
class EmbeddingRequest(BaseModel):
    text: str = Field(..., description="Text to generate embedding for")
    model_version: str = Field(default="paraphrase-multilingual-MiniLM-L12-v2", description="Model version to use")

class BatchEmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., description="List of texts to generate embeddings for")
    model_version: str = Field(default="paraphrase-multilingual-MiniLM-L12-v2", description="Model version to use")

class SimilarityRequest(BaseModel):
    embedding_a: List[float] = Field(..., description="First embedding vector")
    embedding_b: List[float] = Field(..., description="Second embedding vector")

class BookProcessingRequest(BaseModel):
    book: BookData = Field(..., description="Book data to process")
    generate_embedding: bool = Field(default=True, description="Whether to generate embedding")
    update_cache: bool = Field(default=True, description="Whether to update cache")

# Embedding endpoints
@app.post("/embeddings/generate", response_model=Dict[str, Any], tags=["Embeddings"])
async def generate_embedding(request: EmbeddingRequest):
    """Generate embedding for a single text"""
    if not embedding_service:
        raise HTTPException(status_code=503, detail="Embedding service not initialized")
    
    try:
        embedding = await embedding_service.generate_embedding(
            text=request.text,
            model_version=request.model_version
        )
        
        return {
            "embedding": embedding.tolist(),
            "model_version": request.model_version,
            "dimension": len(embedding),
            "success": True
        }
    
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@app.post("/embeddings/batch", response_model=Dict[str, Any], tags=["Embeddings"])
async def generate_batch_embeddings(request: BatchEmbeddingRequest):
    """Generate embeddings for multiple texts"""
    if not embedding_service:
        raise HTTPException(status_code=503, detail="Embedding service not initialized")
    
    try:
        embeddings = await embedding_service.generate_batch_embeddings(
            texts=request.texts,
            model_version=request.model_version
        )
        
        return {
            "embeddings": [emb.tolist() for emb in embeddings],
            "model_version": request.model_version,
            "dimension": len(embeddings[0]) if embeddings else 0,
            "count": len(embeddings),
            "success": True
        }
    
    except Exception as e:
        logger.error(f"Failed to generate batch embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate batch embeddings: {str(e)}")

# Similarity calculation endpoints
@app.post("/similarity/calculate", response_model=Dict[str, Any], tags=["Similarity"])
async def calculate_similarity(request: SimilarityRequest):
    """Calculate cosine similarity between two embeddings"""
    if not similarity_engine:
        raise HTTPException(status_code=503, detail="Similarity engine not initialized")
    
    try:
        similarity = similarity_engine.cosine_similarity(
            request.embedding_a,
            request.embedding_b
        )
        
        return {
            "similarity": float(similarity),
            "success": True
        }
    
    except Exception as e:
        logger.error(f"Failed to calculate similarity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate similarity: {str(e)}")

# Book processing endpoints
@app.post("/books/process", response_model=Dict[str, Any], tags=["Books"])
async def process_book(request: BookProcessingRequest, background_tasks: BackgroundTasks):
    """Process a book to generate embeddings and metadata"""
    if not text_processor or not embedding_service:
        raise HTTPException(status_code=503, detail="Services not initialized")
    
    try:
        # Process book text
        processed_text = text_processor.process_book_text(request.book)
        
        # Generate embedding if requested
        embedding = None
        if request.generate_embedding:
            embedding = await embedding_service.generate_embedding(processed_text)
        
        # Add background task to update cache if requested
        if request.update_cache and embedding is not None:
            background_tasks.add_task(
                cache_manager.cache_book_embedding,
                request.book.id,
                embedding
            )
        
        return {
            "book_id": request.book.id,
            "processed_text": processed_text,
            "embedding": embedding.tolist() if embedding is not None else None,
            "text_hash": text_processor.generate_text_hash(processed_text),
            "language": text_processor.detect_language(processed_text),
            "success": True
        }
    
    except Exception as e:
        logger.error(f"Failed to process book: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process book: {str(e)}")

# Recommendation endpoints
@app.post("/recommendations/similar", response_model=RecommendationResponse, tags=["Recommendations"])
async def get_similar_books(request: RecommendationRequest):
    """Get similar books based on content similarity"""
    if not recommendation_engine:
        raise HTTPException(status_code=503, detail="Recommendation engine not initialized")
    
    try:
        recommendations = await recommendation_engine.get_similar_books(
            book_id=request.book_id,
            limit=request.limit,
            min_similarity=request.min_similarity
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            algorithm="content_similarity",
            model_version="paraphrase-multilingual-MiniLM-L12-v2",
            total_count=len(recommendations)
        )
    
    except Exception as e:
        logger.error(f"Failed to get similar books: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get similar books: {str(e)}")

@app.post("/recommendations/personalized", response_model=RecommendationResponse, tags=["Recommendations"])
async def get_personalized_recommendations(request: RecommendationRequest):
    """Get personalized recommendations based on user behavior"""
    if not recommendation_engine:
        raise HTTPException(status_code=503, detail="Recommendation engine not initialized")
    
    try:
        recommendations = await recommendation_engine.get_personalized_recommendations(
            user_id=request.user_id,
            limit=request.limit,
            exclude_purchased=request.exclude_purchased
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            algorithm="collaborative_filtering",
            model_version="paraphrase-multilingual-MiniLM-L12-v2",
            total_count=len(recommendations)
        )
    
    except Exception as e:
        logger.error(f"Failed to get personalized recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get personalized recommendations: {str(e)}")

@app.post("/recommendations/trending", response_model=RecommendationResponse, tags=["Recommendations"])
async def get_trending_books(request: RecommendationRequest):
    """Get trending books based on recent activity"""
    if not recommendation_engine:
        raise HTTPException(status_code=503, detail="Recommendation engine not initialized")
    
    try:
        recommendations = await recommendation_engine.get_trending_books(
            limit=request.limit,
            time_window_days=request.time_window_days or 30
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            algorithm="trending_popularity",
            model_version="statistical",
            total_count=len(recommendations)
        )
    
    except Exception as e:
        logger.error(f"Failed to get trending books: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get trending books: {str(e)}")

# Admin/Analytics endpoints
@app.get("/analytics/model-info", response_model=Dict[str, Any], tags=["Analytics"])
async def get_model_info():
    """Get information about the current ML models"""
    if not embedding_service:
        raise HTTPException(status_code=503, detail="Embedding service not initialized")
    
    try:
        model_info = embedding_service.get_model_info()
        return {
            "model_info": model_info,
            "cache_stats": cache_manager.get_stats() if cache_manager else {},
            "success": True
        }
    
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

# Error handlers
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "success": False
        }
    )

if __name__ == "__main__":
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    logger.info(f"🚀 Starting Myanmar Book Recommendation AI Service on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )