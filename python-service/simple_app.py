#!/usr/bin/env python3
"""
Simple FastAPI Test Application for AI Recommendations
This is a minimal version to test the core functionality
"""

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
import logging
from typing import List, Dict, Any, Optional
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="AI Book Recommendation Service", version="1.0.0")

# Global variables
model = None
supabase_client = None

# Request/Response models
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

class EmbeddingRequest(BaseModel):
    text: str
    model_version: Optional[str] = "paraphrase-multilingual-MiniLM-L12-v2"

class EmbeddingResponse(BaseModel):
    embedding: List[float]
    model_version: str
    dimension: int
    success: bool

class BookProcessRequest(BaseModel):
    book: Dict[str, Any]
    generate_embedding: bool = True
    update_cache: bool = True

class BookProcessResponse(BaseModel):
    book_id: str
    embedding: Optional[List[float]]
    success: bool
    message: str

# Initialize services
async def initialize_services():
    global model, supabase_client
    
    logger.info("🚀 Initializing AI Recommendation Service...")
    
    # Initialize Supabase
    try:
        SUPABASE_URL = "https://zuzzlrxxmrrovmlopdiy.supabase.co/"
        SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enpscnh4bXJyb3ZtbG9wZGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI2MzE1MywiZXhwIjoyMDY0ODM5MTUzfQ.U-PIVqnn28o_PqJsIRYbr4mZvuOLbnnuU3jz0yqZoAg"
        
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("✅ Supabase client initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase: {e}")
        raise
    
    # Initialize ML model (this will download the model on first run)
    try:
        logger.info("🧠 Loading AI model (this may take a minute on first run)...")
        model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        logger.info("✅ AI model loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load AI model: {e}")
        raise
    
    logger.info("🎉 AI Recommendation Service is ready!")

# Startup event
@app.on_event("startup")
async def startup_event():
    await initialize_services()

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy" if model is not None and supabase_client is not None else "initializing",
        service="AI Book Recommendation Service",
        version="1.0.0"
    )

# Generate embedding endpoint
@app.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    if not model:
        raise HTTPException(status_code=503, detail="AI model not initialized")
    
    try:
        logger.info(f"Generating embedding for text: {request.text[:50]}...")
        embedding = model.encode(request.text)
        
        return EmbeddingResponse(
            embedding=embedding.tolist(),
            model_version=request.model_version,
            dimension=len(embedding),
            success=True
        )
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

# Process book endpoint
@app.post("/books/process", response_model=BookProcessResponse)
async def process_book(request: BookProcessRequest):
    if not model or not supabase_client:
        raise HTTPException(status_code=503, detail="Services not initialized")
    
    try:
        book = request.book
        book_id = book.get("id")
        
        if not book_id:
            raise HTTPException(status_code=400, detail="Book ID is required")
        
        embedding = None
        if request.generate_embedding:
            # Combine book information for embedding
            text_parts = []
            if book.get('name'):
                text_parts.append(f"Title: {book['name']}")
            if book.get('author'):
                text_parts.append(f"Author: {book['author']}")
            if book.get('description'):
                text_parts.append(f"Description: {book['description']}")
            if book.get('category'):
                text_parts.append(f"Category: {book['category']}")
            
            combined_text = '. '.join(text_parts)
            logger.info(f"Processing book: {book.get('name', 'Unknown')}")
            
            # Generate embedding
            embedding_vector = model.encode(combined_text)
            embedding = embedding_vector.tolist()
            
            # Store in database if requested
            if request.update_cache:
                try:
                    # Create or update book embedding
                    supabase_client.table("book_embeddings").upsert({
                        "book_id": book_id,
                        "embedding_vector": embedding,
                        "model_version": "paraphrase-multilingual-MiniLM-L12-v2",
                        "text_hash": str(hash(combined_text)),
                        "metadata": {
                            "text_length": len(combined_text),
                            "embedding_dimension": len(embedding)
                        }
                    }).execute()
                    logger.info(f"✅ Stored embedding for book: {book_id}")
                except Exception as db_error:
                    logger.warning(f"Failed to store embedding in database: {db_error}")
        
        return BookProcessResponse(
            book_id=book_id,
            embedding=embedding,
            success=True,
            message=f"Successfully processed book: {book.get('name', book_id)}"
        )
        
    except Exception as e:
        logger.error(f"Failed to process book: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process book: {str(e)}")

# Get book embeddings from database
@app.get("/books/{book_id}/embedding")
async def get_book_embedding(book_id: str):
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database not initialized")
    
    try:
        result = supabase_client.table("book_embeddings").select("*").eq("book_id", book_id).execute()
        
        if result.data:
            return {
                "book_id": book_id,
                "embedding": result.data[0]["embedding_vector"],
                "model_version": result.data[0]["model_version"],
                "success": True
            }
        else:
            raise HTTPException(status_code=404, detail="Book embedding not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get book embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get book embedding: {str(e)}")

# Test endpoint to check database connectivity
@app.get("/test/database")
async def test_database():
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database not initialized")
    
    try:
        # Test basic connection
        result = supabase_client.table("books").select("id", count="exact").limit(1).execute()
        return {
            "database_status": "connected",
            "books_count": result.count,
            "success": True
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database test failed: {str(e)}")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "🤖 AI Book Recommendation Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/health": "Health check",
            "/embeddings/generate": "Generate text embeddings",
            "/books/process": "Process book and generate embeddings",
            "/books/{book_id}/embedding": "Get book embedding",
            "/test/database": "Test database connection"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)