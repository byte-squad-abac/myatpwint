"""
Recommendation Engine - Core AI recommendation logic
Combines multiple strategies for personalized book recommendations
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

from .embedding_service import EmbeddingService
from .text_processor import TextProcessor
from .similarity_engine import SimilarityEngine

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

logger = logging.getLogger(__name__)

class RecommendationEngine:
    """
    Advanced recommendation engine combining multiple AI strategies
    """
    
    def __init__(
        self,
        embedding_service: EmbeddingService,
        text_processor: TextProcessor,
        similarity_engine: SimilarityEngine,
        cache_manager=None
    ):
        self.embedding_service = embedding_service
        self.text_processor = text_processor
        self.similarity_engine = similarity_engine
        self.cache_manager = cache_manager
        
        # Initialize Supabase client if available
        self.supabase: Optional[Client] = None
        self._initialize_supabase()
        
        self.stats = {
            "recommendations_generated": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "similar_book_requests": 0,
            "personalized_requests": 0,
            "trending_requests": 0
        }
    
    def _initialize_supabase(self):
        """Initialize Supabase client for database operations"""
        if not SUPABASE_AVAILABLE:
            logger.warning("Supabase not available - some features may be limited")
            return
        
        try:
            import os
            supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if supabase_url and supabase_key:
                self.supabase = create_client(supabase_url, supabase_key)
                logger.info("✅ Supabase client initialized")
            else:
                logger.warning("⚠️ Supabase credentials not found")
        
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase: {e}")
    
    async def get_similar_books(
        self,
        book_id: str,
        limit: int = 10,
        min_similarity: float = 0.3,
        exclude_categories: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get books similar to a specific book using content-based filtering
        
        Args:
            book_id: ID of the target book
            limit: Maximum number of recommendations
            min_similarity: Minimum similarity threshold
            exclude_categories: Categories to exclude from results
            
        Returns:
            List of similar books with similarity scores
        """
        self.stats["similar_book_requests"] += 1
        
        try:
            # Check cache first
            cache_key = f"similar_{book_id}_{limit}_{min_similarity}"
            cached_result = await self._get_from_cache(cache_key)
            if cached_result:
                self.stats["cache_hits"] += 1
                return cached_result
            
            self.stats["cache_misses"] += 1
            
            # Get target book data
            target_book = await self._get_book_data(book_id)
            if not target_book:
                logger.error(f"Book not found: {book_id}")
                return []
            
            # Ensure target book has embedding
            target_embedding = await self._get_or_generate_book_embedding(target_book)
            if target_embedding is None:
                logger.error(f"Could not generate embedding for book: {book_id}")
                return []
            
            # Get candidate books
            candidates = await self._get_candidate_books(
                exclude_book_id=book_id,
                exclude_categories=exclude_categories
            )
            
            # Calculate similarities
            similar_books = []
            for candidate in candidates:
                candidate_embedding = await self._get_or_generate_book_embedding(candidate)
                if candidate_embedding is None:
                    continue
                
                similarity = self.similarity_engine.cosine_similarity(
                    target_embedding,
                    candidate_embedding
                )
                
                if similarity >= min_similarity:
                    candidate_copy = candidate.copy()
                    candidate_copy["similarity_score"] = similarity
                    candidate_copy["recommendation_reason"] = self._generate_similarity_reason(
                        target_book, candidate
                    )
                    similar_books.append(candidate_copy)
            
            # Rank and diversify results
            similar_books.sort(key=lambda x: x["similarity_score"], reverse=True)
            diversified_books = self.similarity_engine.diversify_results(
                similar_books[:limit * 2],  # Get more candidates for diversity
                diversity_factor=0.3
            )[:limit]
            
            # Cache result
            await self._set_cache(cache_key, diversified_books, ttl=3600)  # 1 hour
            
            self.stats["recommendations_generated"] += 1
            return diversified_books
            
        except Exception as e:
            logger.error(f"Error getting similar books: {e}")
            return []
    
    async def get_personalized_recommendations(
        self,
        user_id: str,
        limit: int = 10,
        exclude_purchased: bool = True,
        time_decay_factor: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations based on user behavior
        
        Args:
            user_id: ID of the user
            limit: Maximum number of recommendations
            exclude_purchased: Whether to exclude already purchased books
            time_decay_factor: Factor for decaying older interactions
            
        Returns:
            List of personalized recommendations
        """
        self.stats["personalized_requests"] += 1
        
        try:
            # Check cache first
            cache_key = f"personalized_{user_id}_{limit}_{exclude_purchased}"
            cached_result = await self._get_from_cache(cache_key)
            if cached_result:
                self.stats["cache_hits"] += 1
                return cached_result
            
            self.stats["cache_misses"] += 1
            
            # Get user interaction history
            user_interactions = await self._get_user_interactions(user_id)
            if not user_interactions:
                # Cold start: return trending books
                logger.info(f"No interactions found for user {user_id}, returning trending books")
                return await self.get_trending_books(limit)
            
            # Build user preference profile
            user_profile = await self._build_user_profile(user_interactions, time_decay_factor)
            
            # Get candidate books
            exclude_book_ids = []
            if exclude_purchased:
                exclude_book_ids = await self._get_user_purchased_books(user_id)
            
            candidates = await self._get_candidate_books(exclude_book_ids=exclude_book_ids)
            
            # Calculate user-book affinities
            recommendations = []
            for candidate in candidates:
                candidate_embedding = await self._get_or_generate_book_embedding(candidate)
                if candidate_embedding is None:
                    continue
                
                affinity = self.similarity_engine.calculate_user_book_affinity(
                    user_profile,
                    {**candidate, "embedding": candidate_embedding}
                )
                
                if affinity > 0.2:  # Minimum affinity threshold
                    candidate_copy = candidate.copy()
                    candidate_copy["similarity_score"] = affinity
                    candidate_copy["recommendation_reason"] = self._generate_personalized_reason(
                        user_profile, candidate
                    )
                    recommendations.append(candidate_copy)
            
            # Rank and diversify
            recommendations.sort(key=lambda x: x["similarity_score"], reverse=True)
            diversified_recs = self.similarity_engine.diversify_results(
                recommendations[:limit * 2],
                diversity_factor=0.4  # Higher diversity for personalized recs
            )[:limit]
            
            # Cache result
            await self._set_cache(cache_key, diversified_recs, ttl=1800)  # 30 minutes
            
            self.stats["recommendations_generated"] += 1
            return diversified_recs
            
        except Exception as e:
            logger.error(f"Error getting personalized recommendations: {e}")
            return []
    
    async def get_trending_books(
        self,
        limit: int = 10,
        time_window_days: int = 30,
        min_interactions: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get trending books based on recent activity
        
        Args:
            limit: Maximum number of books to return
            time_window_days: Time window for trending calculation
            min_interactions: Minimum interactions required for trending
            
        Returns:
            List of trending books
        """
        self.stats["trending_requests"] += 1
        
        try:
            # Check cache first
            cache_key = f"trending_{limit}_{time_window_days}_{min_interactions}"
            cached_result = await self._get_from_cache(cache_key)
            if cached_result:
                self.stats["cache_hits"] += 1
                return cached_result
            
            self.stats["cache_misses"] += 1
            
            if not self.supabase:
                logger.warning("Supabase not available - returning empty trending list")
                return []
            
            # Calculate trending score based on recent activity
            cutoff_date = (datetime.now() - timedelta(days=time_window_days)).isoformat()
            
            # Query for trending books
            trending_query = f"""
            SELECT 
                b.id,
                b.name,
                b.author,
                b.description,
                b.category,
                b.tags,
                b.price,
                b.image_url,
                COUNT(DISTINCT p.id) as purchase_count,
                COUNT(DISTINCT ri.id) as interaction_count,
                (COUNT(DISTINCT p.id) * 2.0 + COUNT(DISTINCT ri.id)) as trend_score
            FROM books b
            LEFT JOIN purchases p ON b.id = p.book_id 
                AND p.purchased_at > '{cutoff_date}'
                AND p.payment_status IN ('succeeded', 'completed')
            LEFT JOIN recommendation_interactions ri ON b.id = ri.book_id
                AND ri.created_at > '{cutoff_date}'
                AND ri.interaction_type IN ('click', 'view', 'like')
            GROUP BY b.id, b.name, b.author, b.description, b.category, b.tags, b.price, b.image_url
            HAVING (COUNT(DISTINCT p.id) + COUNT(DISTINCT ri.id)) >= {min_interactions}
            ORDER BY trend_score DESC, purchase_count DESC
            LIMIT {limit}
            """
            
            result = self.supabase.rpc("execute_raw_sql", {"query": trending_query}).execute()
            
            trending_books = []
            for book_data in result.data or []:
                book_copy = dict(book_data)
                book_copy["similarity_score"] = min(1.0, book_data["trend_score"] / 100.0)
                book_copy["recommendation_reason"] = f"Trending with {book_data['purchase_count']} recent purchases"
                
                # Parse tags if they're JSON strings
                if book_copy.get("tags") and isinstance(book_copy["tags"], str):
                    try:
                        book_copy["tags"] = json.loads(book_copy["tags"])
                    except:
                        book_copy["tags"] = []
                
                trending_books.append(book_copy)
            
            # Cache result
            await self._set_cache(cache_key, trending_books, ttl=1800)  # 30 minutes
            
            self.stats["recommendations_generated"] += 1
            return trending_books
            
        except Exception as e:
            logger.error(f"Error getting trending books: {e}")
            return []
    
    async def _get_book_data(self, book_id: str) -> Optional[Dict[str, Any]]:
        """Get book data from database"""
        if not self.supabase:
            return None
        
        try:
            result = self.supabase.table("books").select("*").eq("id", book_id).execute()
            if result.data:
                book = dict(result.data[0])
                # Parse tags if they're JSON strings
                if book.get("tags") and isinstance(book["tags"], str):
                    try:
                        book["tags"] = json.loads(book["tags"])
                    except:
                        book["tags"] = []
                return book
            return None
            
        except Exception as e:
            logger.error(f"Error getting book data: {e}")
            return None
    
    async def _get_candidate_books(
        self,
        exclude_book_id: Optional[str] = None,
        exclude_book_ids: Optional[List[str]] = None,
        exclude_categories: Optional[List[str]] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get candidate books for recommendations"""
        if not self.supabase:
            return []
        
        try:
            query = self.supabase.table("books").select("*")
            
            # Apply filters
            if exclude_book_id:
                query = query.neq("id", exclude_book_id)
            
            if exclude_book_ids:
                for book_id in exclude_book_ids:
                    query = query.neq("id", book_id)
            
            if exclude_categories:
                for category in exclude_categories:
                    query = query.neq("category", category)
            
            result = query.limit(limit).execute()
            
            candidates = []
            for book_data in result.data or []:
                book = dict(book_data)
                # Parse tags if they're JSON strings
                if book.get("tags") and isinstance(book["tags"], str):
                    try:
                        book["tags"] = json.loads(book["tags"])
                    except:
                        book["tags"] = []
                candidates.append(book)
            
            return candidates
            
        except Exception as e:
            logger.error(f"Error getting candidate books: {e}")
            return []
    
    async def _get_or_generate_book_embedding(self, book: Dict[str, Any]) -> Optional[List[float]]:
        """Get or generate embedding for a book"""
        try:
            # Check if embedding already exists in database
            if self.supabase:
                result = self.supabase.table("book_embeddings").select("embedding_vector").eq("book_id", book["id"]).execute()
                if result.data:
                    return result.data[0]["embedding_vector"]
            
            # Generate new embedding
            embedding = await self.embedding_service.generate_book_embedding(book)
            
            # Store embedding in database
            if self.supabase and embedding is not None:
                text_hash = self.text_processor.generate_text_hash(
                    self.text_processor.process_book_text(book)
                )
                
                self.supabase.table("book_embeddings").upsert({
                    "book_id": book["id"],
                    "embedding_vector": embedding.tolist(),
                    "text_hash": text_hash,
                    "updated_at": datetime.now().isoformat()
                }).execute()
            
            return embedding.tolist() if embedding is not None else None
            
        except Exception as e:
            logger.error(f"Error getting/generating book embedding: {e}")
            return None
    
    async def _get_user_interactions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user interaction history"""
        if not self.supabase:
            return []
        
        try:
            # Get purchases
            purchases = self.supabase.table("purchases").select(
                "book_id, books(name, author, category, tags, description), purchased_at"
            ).eq("user_id", user_id).eq("payment_status", "succeeded").execute()
            
            interactions = []
            for purchase in purchases.data or []:
                interactions.append({
                    "book_id": purchase["book_id"],
                    "book": purchase["books"],
                    "interaction_type": "purchase",
                    "timestamp": purchase["purchased_at"],
                    "weight": 3.0  # High weight for purchases
                })
            
            # Get other interactions
            other_interactions = self.supabase.table("recommendation_interactions").select(
                "book_id, interaction_type, created_at, books(name, author, category, tags, description)"
            ).eq("user_id", user_id).in_(
                "interaction_type", ["click", "view", "like", "bookmark"]
            ).execute()
            
            for interaction in other_interactions.data or []:
                weight_map = {"like": 2.0, "bookmark": 2.0, "click": 1.0, "view": 0.5}
                interactions.append({
                    "book_id": interaction["book_id"],
                    "book": interaction["books"],
                    "interaction_type": interaction["interaction_type"],
                    "timestamp": interaction["created_at"],
                    "weight": weight_map.get(interaction["interaction_type"], 1.0)
                })
            
            return interactions
            
        except Exception as e:
            logger.error(f"Error getting user interactions: {e}")
            return []
    
    async def _build_user_profile(
        self, 
        interactions: List[Dict[str, Any]], 
        time_decay_factor: float
    ) -> Dict[str, Any]:
        """Build user preference profile from interactions"""
        try:
            # Extract preferences
            categories = {}
            authors = {}
            interaction_texts = []
            
            # Current time for time decay calculation
            now = datetime.now()
            
            for interaction in interactions:
                book = interaction.get("book", {})
                if not book:
                    continue
                
                # Calculate time decay
                interaction_time = datetime.fromisoformat(interaction["timestamp"].replace("Z", "+00:00"))
                days_old = (now - interaction_time).days
                time_weight = max(0.1, 1.0 - (days_old * time_decay_factor / 365))
                
                # Weight by interaction type and time
                final_weight = interaction["weight"] * time_weight
                
                # Collect categories
                if book.get("category"):
                    category = book["category"]
                    categories[category] = categories.get(category, 0) + final_weight
                
                # Collect authors
                if book.get("author"):
                    author = book["author"]
                    authors[author] = authors.get(author, 0) + final_weight
                
                # Collect text for embedding generation
                if final_weight > 0.5:  # Only include significant interactions
                    book_text = self.text_processor.process_book_text(book)
                    for _ in range(int(final_weight)):  # Weight by adding multiple times
                        interaction_texts.append(book_text)
            
            # Generate user preference embedding
            preference_embedding = None
            if interaction_texts:
                preference_embedding = await self.embedding_service.generate_user_preference_embedding([
                    {"book": {"name": text}, "interaction_type": "purchase"} 
                    for text in interaction_texts
                ])
            
            # Sort preferences
            favorite_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]
            favorite_authors = sorted(authors.items(), key=lambda x: x[1], reverse=True)[:3]
            
            return {
                "preference_embedding": preference_embedding.tolist() if preference_embedding is not None else None,
                "favorite_categories": [cat for cat, _ in favorite_categories],
                "favorite_authors": [author for author, _ in favorite_authors],
                "interaction_count": len(interactions)
            }
            
        except Exception as e:
            logger.error(f"Error building user profile: {e}")
            return {}
    
    async def _get_user_purchased_books(self, user_id: str) -> List[str]:
        """Get list of books already purchased by user"""
        if not self.supabase:
            return []
        
        try:
            result = self.supabase.table("purchases").select("book_id").eq(
                "user_id", user_id
            ).eq("payment_status", "succeeded").execute()
            
            return [purchase["book_id"] for purchase in result.data or []]
            
        except Exception as e:
            logger.error(f"Error getting user purchased books: {e}")
            return []
    
    def _generate_similarity_reason(self, target_book: Dict, candidate_book: Dict) -> str:
        """Generate explanation for why books are similar"""
        reasons = []
        
        # Category match
        if target_book.get("category") == candidate_book.get("category"):
            reasons.append(f"same category ({target_book.get('category')})")
        
        # Author match
        if target_book.get("author") == candidate_book.get("author"):
            reasons.append(f"same author ({target_book.get('author')})")
        
        # Tag overlap
        target_tags = set(target_book.get("tags", []))
        candidate_tags = set(candidate_book.get("tags", []))
        common_tags = target_tags & candidate_tags
        if common_tags:
            reasons.append(f"similar topics ({', '.join(list(common_tags)[:2])})")
        
        if not reasons:
            reasons.append("similar content themes")
        
        return f"Recommended because of {', '.join(reasons)}"
    
    def _generate_personalized_reason(self, user_profile: Dict, book: Dict) -> str:
        """Generate explanation for personalized recommendation"""
        reasons = []
        
        # Category preference
        if book.get("category") in user_profile.get("favorite_categories", []):
            reasons.append(f"you enjoy {book.get('category')} books")
        
        # Author preference
        if book.get("author") in user_profile.get("favorite_authors", []):
            reasons.append(f"you like books by {book.get('author')}")
        
        if not reasons:
            reasons.append("matches your reading preferences")
        
        return f"Recommended because {', '.join(reasons)}"
    
    async def _get_from_cache(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get data from cache"""
        if self.cache_manager:
            return await self.cache_manager.get(key)
        return None
    
    async def _set_cache(self, key: str, data: List[Dict[str, Any]], ttl: int):
        """Set data in cache"""
        if self.cache_manager:
            await self.cache_manager.set(key, data, ttl)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get recommendation engine statistics"""
        return self.stats.copy()