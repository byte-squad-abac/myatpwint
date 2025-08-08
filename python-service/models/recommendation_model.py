"""
Recommendation Model - Pydantic models for recommendation system
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from .book_model import EnrichedBook, BookRecommendation

class RecommendationRequest(BaseModel):
    """Request for book recommendations"""
    user_id: Optional[str] = Field(None, description="User ID for personalized recommendations")
    book_id: Optional[str] = Field(None, description="Book ID for similar book recommendations")
    recommendation_type: str = Field(..., description="Type of recommendation to generate")
    limit: int = Field(default=10, description="Maximum number of recommendations")
    min_similarity: float = Field(default=0.1, description="Minimum similarity threshold")
    exclude_purchased: bool = Field(default=True, description="Exclude already purchased books")
    time_window_days: Optional[int] = Field(None, description="Time window for trending calculations")
    categories: Optional[List[str]] = Field(None, description="Category filters")
    price_range: Optional[Dict[str, float]] = Field(None, description="Price range filter")
    language_preference: Optional[str] = Field(None, description="Language preference")
    diversity_factor: float = Field(default=0.3, description="Diversity factor for results")
    
    @validator('recommendation_type')
    def validate_recommendation_type(cls, v):
        """Validate recommendation type"""
        valid_types = ['similar', 'personalized', 'trending', 'category', 'author', 'new_release']
        if v not in valid_types:
            raise ValueError(f'Invalid recommendation type. Must be one of: {valid_types}')
        return v
    
    @validator('limit')
    def validate_limit(cls, v):
        """Ensure limit is reasonable"""
        if v < 1 or v > 50:
            raise ValueError('Limit must be between 1 and 50')
        return v
    
    @validator('min_similarity')
    def validate_min_similarity(cls, v):
        """Ensure similarity threshold is valid"""
        if not 0 <= v <= 1:
            raise ValueError('Minimum similarity must be between 0 and 1')
        return v
    
    @validator('diversity_factor')
    def validate_diversity_factor(cls, v):
        """Ensure diversity factor is valid"""
        if not 0 <= v <= 1:
            raise ValueError('Diversity factor must be between 0 and 1')
        return v

class RecommendationResponse(BaseModel):
    """Response containing book recommendations"""
    recommendations: List[EnrichedBook] = Field(..., description="List of recommended books")
    algorithm: str = Field(..., description="Algorithm used for recommendations")
    model_version: str = Field(..., description="Model version used")
    total_count: int = Field(..., description="Total number of recommendations")
    request_id: Optional[str] = Field(None, description="Request identifier")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    cached: bool = Field(default=False, description="Whether result was cached")
    
    @validator('total_count')
    def validate_total_count(cls, v):
        """Ensure total count is non-negative"""
        if v < 0:
            raise ValueError('Total count must be non-negative')
        return v

class RecommendationInteraction(BaseModel):
    """Model for tracking recommendation interactions"""
    id: Optional[str] = Field(None, description="Interaction ID")
    user_id: Optional[str] = Field(None, description="User ID")
    book_id: str = Field(..., description="Book ID")
    interaction_type: str = Field(..., description="Type of interaction")
    recommendation_type: str = Field(..., description="Type of recommendation that led to interaction")
    algorithm_version: str = Field(default="v1.0", description="Algorithm version")
    similarity_score: Optional[float] = Field(None, description="Original similarity score")
    position_in_list: Optional[int] = Field(None, description="Position in recommendation list")
    session_id: Optional[str] = Field(None, description="Session identifier")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    created_at: datetime = Field(default_factory=datetime.now, description="Interaction timestamp")
    
    @validator('interaction_type')
    def validate_interaction_type(cls, v):
        """Validate interaction type"""
        valid_types = ['view', 'click', 'purchase', 'like', 'dislike', 'bookmark', 'share']
        if v not in valid_types:
            raise ValueError(f'Invalid interaction type. Must be one of: {valid_types}')
        return v
    
    @validator('recommendation_type')
    def validate_recommendation_type(cls, v):
        """Validate recommendation type"""
        valid_types = ['similar', 'personalized', 'trending', 'category', 'author', 'new_release']
        if v not in valid_types:
            raise ValueError(f'Invalid recommendation type. Must be one of: {valid_types}')
        return v
    
    @validator('position_in_list')
    def validate_position(cls, v):
        """Ensure position is positive"""
        if v is not None and v < 1:
            raise ValueError('Position in list must be positive')
        return v

class RecommendationCache(BaseModel):
    """Model for recommendation cache entries"""
    cache_key: str = Field(..., description="Cache key")
    user_id: Optional[str] = Field(None, description="User ID")
    recommendation_type: str = Field(..., description="Type of recommendation")
    book_ids: List[str] = Field(..., description="List of recommended book IDs")
    scores: List[float] = Field(..., description="Corresponding similarity scores")
    algorithm_version: str = Field(default="v1.0", description="Algorithm version")
    expires_at: datetime = Field(..., description="Cache expiration time")
    created_at: datetime = Field(default_factory=datetime.now, description="Cache creation time")
    
    @validator('book_ids', 'scores')
    def validate_equal_length(cls, v, values):
        """Ensure book_ids and scores have equal length"""
        if 'book_ids' in values and len(v) != len(values['book_ids']):
            raise ValueError('book_ids and scores must have equal length')
        return v

class RecommendationAnalytics(BaseModel):
    """Analytics data for recommendations"""
    date: str = Field(..., description="Analytics date")
    recommendation_type: str = Field(..., description="Recommendation type")
    algorithm_version: str = Field(default="v1.0", description="Algorithm version")
    impressions: int = Field(default=0, description="Total impressions")
    clicks: int = Field(default=0, description="Total clicks")
    conversions: int = Field(default=0, description="Total conversions")
    unique_users: int = Field(default=0, description="Unique users")
    avg_position_clicked: Optional[float] = Field(None, description="Average position of clicked items")
    avg_similarity_score: Optional[float] = Field(None, description="Average similarity score")
    category_breakdown: Optional[Dict[str, int]] = Field(None, description="Breakdown by category")
    
    @property
    def click_through_rate(self) -> float:
        """Calculate click-through rate"""
        return self.clicks / self.impressions if self.impressions > 0 else 0.0
    
    @property
    def conversion_rate(self) -> float:
        """Calculate conversion rate"""
        return self.conversions / self.clicks if self.clicks > 0 else 0.0

class SimilarityCalculationRequest(BaseModel):
    """Request for similarity calculation"""
    source_embedding: List[float] = Field(..., description="Source embedding vector")
    target_embeddings: List[List[float]] = Field(..., description="Target embedding vectors")
    similarity_metric: str = Field(default="cosine", description="Similarity metric to use")
    normalize_scores: bool = Field(default=True, description="Whether to normalize scores")
    
    @validator('similarity_metric')
    def validate_similarity_metric(cls, v):
        """Validate similarity metric"""
        valid_metrics = ['cosine', 'euclidean', 'manhattan', 'dot_product']
        if v not in valid_metrics:
            raise ValueError(f'Invalid similarity metric. Must be one of: {valid_metrics}')
        return v
    
    @validator('source_embedding', 'target_embeddings')
    def validate_embeddings(cls, v):
        """Ensure embeddings are not empty"""
        if isinstance(v, list):
            if not v:
                raise ValueError('Embeddings cannot be empty')
            if isinstance(v[0], list):  # target_embeddings
                for emb in v:
                    if not emb:
                        raise ValueError('Individual embeddings cannot be empty')
        return v

class SimilarityCalculationResponse(BaseModel):
    """Response for similarity calculation"""
    similarities: List[float] = Field(..., description="Similarity scores")
    metric_used: str = Field(..., description="Similarity metric used")
    normalized: bool = Field(..., description="Whether scores were normalized")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")
    
    @validator('similarities')
    def validate_similarities(cls, v):
        """Ensure similarity scores are valid"""
        for score in v:
            if not isinstance(score, (int, float)) or score < 0:
                raise ValueError('Similarity scores must be non-negative numbers')
        return v

class BatchRecommendationRequest(BaseModel):
    """Request for batch recommendations"""
    requests: List[RecommendationRequest] = Field(..., description="List of recommendation requests")
    batch_id: Optional[str] = Field(None, description="Batch identifier")
    parallel_processing: bool = Field(default=True, description="Whether to process in parallel")
    
    @validator('requests')
    def validate_requests(cls, v):
        """Ensure requests list is not empty"""
        if not v:
            raise ValueError('Requests list cannot be empty')
        if len(v) > 100:
            raise ValueError('Maximum 100 requests per batch')
        return v

class BatchRecommendationResponse(BaseModel):
    """Response for batch recommendations"""
    responses: List[RecommendationResponse] = Field(..., description="List of recommendation responses")
    batch_id: Optional[str] = Field(None, description="Batch identifier")
    total_requests: int = Field(..., description="Total number of requests processed")
    successful_requests: int = Field(..., description="Number of successful requests")
    failed_requests: int = Field(..., description="Number of failed requests")
    total_processing_time: Optional[float] = Field(None, description="Total processing time")
    errors: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="List of errors encountered")

class ModelPerformanceMetrics(BaseModel):
    """Metrics for model performance evaluation"""
    model_version: str = Field(..., description="Model version")
    evaluation_date: datetime = Field(default_factory=datetime.now, description="Evaluation date")
    precision_at_k: Optional[Dict[str, float]] = Field(None, description="Precision at K metrics")
    recall_at_k: Optional[Dict[str, float]] = Field(None, description="Recall at K metrics")
    mean_average_precision: Optional[float] = Field(None, description="Mean Average Precision")
    normalized_dcg: Optional[float] = Field(None, description="Normalized Discounted Cumulative Gain")
    diversity_score: Optional[float] = Field(None, description="Recommendation diversity score")
    coverage_score: Optional[float] = Field(None, description="Catalog coverage score")
    novelty_score: Optional[float] = Field(None, description="Recommendation novelty score")
    
    @validator('precision_at_k', 'recall_at_k')
    def validate_metrics_dict(cls, v):
        """Validate metrics dictionaries"""
        if v:
            for k, val in v.items():
                if not 0 <= val <= 1:
                    raise ValueError(f'Metric value for {k} must be between 0 and 1')
        return v

class ABTestConfiguration(BaseModel):
    """Configuration for A/B testing recommendations"""
    test_id: str = Field(..., description="A/B test identifier")
    control_algorithm: str = Field(..., description="Control algorithm")
    test_algorithm: str = Field(..., description="Test algorithm")
    traffic_split: float = Field(default=0.5, description="Traffic split ratio")
    start_date: datetime = Field(..., description="Test start date")
    end_date: datetime = Field(..., description="Test end date")
    success_metrics: List[str] = Field(..., description="Success metrics to track")
    minimum_sample_size: int = Field(default=100, description="Minimum sample size per variant")
    
    @validator('traffic_split')
    def validate_traffic_split(cls, v):
        """Ensure traffic split is valid"""
        if not 0 < v < 1:
            raise ValueError('Traffic split must be between 0 and 1')
        return v
    
    @validator('success_metrics')
    def validate_success_metrics(cls, v):
        """Validate success metrics"""
        valid_metrics = ['ctr', 'conversion_rate', 'engagement_time', 'revenue_per_user']
        for metric in v:
            if metric not in valid_metrics:
                raise ValueError(f'Invalid success metric: {metric}')
        return v