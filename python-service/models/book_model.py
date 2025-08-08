"""
Book Model - Pydantic models for book data structures
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, validator
from datetime import datetime

class BookData(BaseModel):
    """Book data model matching your Supabase schema"""
    id: str = Field(..., description="Unique book identifier")
    name: str = Field(..., description="Book title/name")
    author: str = Field(..., description="Book author")
    description: Optional[str] = Field(None, description="Book description")
    category: Optional[str] = Field(None, description="Book category")
    tags: Optional[List[str]] = Field(default_factory=list, description="Book tags")
    price: Optional[float] = Field(None, description="Book price in MMK")
    image_url: Optional[str] = Field(None, description="Book cover image URL")
    file_url: Optional[str] = Field(None, description="Book file URL")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    published_date: Optional[str] = Field(None, description="Publication date")
    edition: Optional[str] = Field(None, description="Book edition")
    manuscript_id: Optional[str] = Field(None, description="Associated manuscript ID")
    source: Optional[str] = Field(default="publisher", description="Book source")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    
    @validator('tags', pre=True)
    def parse_tags(cls, v):
        """Parse tags from various formats"""
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except:
                return [v]
        elif isinstance(v, list):
            return v
        else:
            return []
    
    @validator('price')
    def validate_price(cls, v):
        """Ensure price is positive"""
        if v is not None and v < 0:
            raise ValueError('Price must be non-negative')
        return v

class BookEmbedding(BaseModel):
    """Book embedding model for vector storage"""
    book_id: str = Field(..., description="Book identifier")
    embedding_vector: List[float] = Field(..., description="Embedding vector")
    model_version: str = Field(default="paraphrase-multilingual-MiniLM-L12-v2", description="Model version")
    text_hash: str = Field(..., description="Hash of processed text")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    created_at: Optional[datetime] = Field(default_factory=datetime.now, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default_factory=datetime.now, description="Update timestamp")
    
    @validator('embedding_vector')
    def validate_embedding_dimension(cls, v):
        """Validate embedding dimension"""
        if len(v) == 0:
            raise ValueError('Embedding vector cannot be empty')
        return v

class BookSimilarity(BaseModel):
    """Model for book similarity relationships"""
    book_id_a: str = Field(..., description="First book ID")
    book_id_b: str = Field(..., description="Second book ID")
    similarity_score: float = Field(..., description="Similarity score (0-1)")
    algorithm_version: str = Field(default="v1.0", description="Algorithm version")
    created_at: Optional[datetime] = Field(default_factory=datetime.now, description="Creation timestamp")
    
    @validator('similarity_score')
    def validate_similarity_score(cls, v):
        """Ensure similarity score is between 0 and 1"""
        if not 0 <= v <= 1:
            raise ValueError('Similarity score must be between 0 and 1')
        return v

class EnrichedBook(BookData):
    """Book data enriched with ML-generated features"""
    similarity_score: Optional[float] = Field(None, description="Similarity score for recommendations")
    recommendation_reason: Optional[str] = Field(None, description="Reason for recommendation")
    language: Optional[str] = Field(None, description="Detected language")
    readability: Optional[str] = Field(None, description="Readability level")
    keywords: Optional[List[str]] = Field(default_factory=list, description="Extracted keywords")
    price_range: Optional[str] = Field(None, description="Price category")
    
    class Config:
        """Pydantic config"""
        extra = "allow"  # Allow additional fields

class BookProcessingResult(BaseModel):
    """Result of book processing pipeline"""
    book_id: str = Field(..., description="Book identifier")
    processed_text: str = Field(..., description="Processed text for embedding")
    embedding: Optional[List[float]] = Field(None, description="Generated embedding")
    text_hash: str = Field(..., description="Hash of processed text")
    language: str = Field(..., description="Detected language")
    keywords: List[str] = Field(default_factory=list, description="Extracted keywords")
    text_statistics: Dict[str, Any] = Field(default_factory=dict, description="Text analysis stats")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")
    success: bool = Field(default=True, description="Processing success status")
    error_message: Optional[str] = Field(None, description="Error message if failed")

class UserInteraction(BaseModel):
    """User interaction with books"""
    user_id: str = Field(..., description="User identifier")
    book_id: str = Field(..., description="Book identifier")
    interaction_type: str = Field(..., description="Type of interaction")
    timestamp: datetime = Field(default_factory=datetime.now, description="Interaction timestamp")
    weight: float = Field(default=1.0, description="Interaction weight")
    book: Optional[BookData] = Field(None, description="Associated book data")
    
    @validator('interaction_type')
    def validate_interaction_type(cls, v):
        """Validate interaction type"""
        valid_types = ['view', 'click', 'purchase', 'like', 'dislike', 'bookmark', 'share']
        if v not in valid_types:
            raise ValueError(f'Invalid interaction type. Must be one of: {valid_types}')
        return v
    
    @validator('weight')
    def validate_weight(cls, v):
        """Ensure weight is positive"""
        if v <= 0:
            raise ValueError('Weight must be positive')
        return v

class UserProfile(BaseModel):
    """User preference profile"""
    user_id: str = Field(..., description="User identifier")
    preference_embedding: Optional[List[float]] = Field(None, description="User preference vector")
    favorite_categories: List[str] = Field(default_factory=list, description="Preferred categories")
    favorite_authors: List[str] = Field(default_factory=list, description="Preferred authors")
    preferred_language: str = Field(default="myanmar", description="Preferred language")
    price_range_min: float = Field(default=0, description="Minimum price preference")
    price_range_max: float = Field(default=100000, description="Maximum price preference")
    interaction_count: int = Field(default=0, description="Total interaction count")
    last_updated: datetime = Field(default_factory=datetime.now, description="Last update timestamp")
    
    @validator('price_range_min', 'price_range_max')
    def validate_price_range(cls, v):
        """Ensure price range is non-negative"""
        if v < 0:
            raise ValueError('Price range must be non-negative')
        return v

class BookRecommendation(BaseModel):
    """Individual book recommendation"""
    book: EnrichedBook = Field(..., description="Recommended book data")
    similarity_score: float = Field(..., description="Recommendation score")
    recommendation_reason: str = Field(..., description="Reason for recommendation")
    rank: int = Field(..., description="Recommendation rank")
    algorithm_used: str = Field(..., description="Algorithm used for recommendation")
    
    @validator('similarity_score')
    def validate_score(cls, v):
        """Ensure similarity score is between 0 and 1"""
        if not 0 <= v <= 1:
            raise ValueError('Similarity score must be between 0 and 1')
        return v
    
    @validator('rank')
    def validate_rank(cls, v):
        """Ensure rank is positive"""
        if v < 1:
            raise ValueError('Rank must be positive')
        return v

class RecommendationMetrics(BaseModel):
    """Metrics for recommendation performance"""
    date: str = Field(..., description="Date for metrics")
    recommendation_type: str = Field(..., description="Type of recommendation")
    algorithm_version: str = Field(default="v1.0", description="Algorithm version")
    total_impressions: int = Field(default=0, description="Total recommendation impressions")
    total_clicks: int = Field(default=0, description="Total clicks on recommendations")
    total_conversions: int = Field(default=0, description="Total conversions from recommendations")
    click_through_rate: float = Field(default=0.0, description="Click-through rate")
    conversion_rate: float = Field(default=0.0, description="Conversion rate")
    avg_similarity_score: float = Field(default=0.0, description="Average similarity score")
    unique_users: int = Field(default=0, description="Number of unique users")
    
    @validator('total_impressions', 'total_clicks', 'total_conversions', 'unique_users')
    def validate_non_negative(cls, v):
        """Ensure counts are non-negative"""
        if v < 0:
            raise ValueError('Count values must be non-negative')
        return v

class BookSearchQuery(BaseModel):
    """Search query for books"""
    query: str = Field(..., description="Search query text")
    category: Optional[str] = Field(None, description="Category filter")
    author: Optional[str] = Field(None, description="Author filter")
    price_min: Optional[float] = Field(None, description="Minimum price filter")
    price_max: Optional[float] = Field(None, description="Maximum price filter")
    tags: Optional[List[str]] = Field(None, description="Tag filters")
    language: Optional[str] = Field(None, description="Language filter")
    limit: int = Field(default=20, description="Maximum results to return")
    offset: int = Field(default=0, description="Result offset for pagination")
    
    @validator('limit')
    def validate_limit(cls, v):
        """Ensure limit is reasonable"""
        if v < 1 or v > 100:
            raise ValueError('Limit must be between 1 and 100')
        return v
    
    @validator('offset')
    def validate_offset(cls, v):
        """Ensure offset is non-negative"""
        if v < 0:
            raise ValueError('Offset must be non-negative')
        return v

class BatchProcessingRequest(BaseModel):
    """Request for batch processing of books"""
    book_ids: List[str] = Field(..., description="List of book IDs to process")
    operations: List[str] = Field(..., description="Operations to perform")
    force_update: bool = Field(default=False, description="Force update existing embeddings")
    batch_size: int = Field(default=10, description="Batch processing size")
    
    @validator('book_ids')
    def validate_book_ids(cls, v):
        """Ensure book IDs list is not empty"""
        if not v:
            raise ValueError('Book IDs list cannot be empty')
        return v
    
    @validator('operations')
    def validate_operations(cls, v):
        """Validate operation types"""
        valid_ops = ['generate_embedding', 'update_keywords', 'analyze_text', 'calculate_similarities']
        for op in v:
            if op not in valid_ops:
                raise ValueError(f'Invalid operation: {op}. Valid operations: {valid_ops}')
        return v