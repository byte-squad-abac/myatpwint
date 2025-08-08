"""
Similarity Engine - Handles vector similarity calculations and ranking
Optimized for book recommendation similarity scoring
"""

import logging
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from scipy.spatial.distance import cosine
import math

logger = logging.getLogger(__name__)

class SimilarityEngine:
    """
    Advanced similarity engine for book recommendations
    Supports multiple similarity metrics and ranking strategies
    """
    
    def __init__(self):
        self.stats = {
            "similarities_calculated": 0,
            "batch_calculations": 0,
            "average_calculation_time": 0
        }
    
    def cosine_similarity(
        self, 
        vector_a: List[float], 
        vector_b: List[float]
    ) -> float:
        """
        Calculate cosine similarity between two vectors
        
        Args:
            vector_a: First vector
            vector_b: Second vector
            
        Returns:
            Cosine similarity score (0-1, where 1 is most similar)
        """
        try:
            # Convert to numpy arrays
            a = np.array(vector_a, dtype=np.float32)
            b = np.array(vector_b, dtype=np.float32)
            
            # Handle edge cases
            if len(a) == 0 or len(b) == 0:
                return 0.0
            
            if len(a) != len(b):
                logger.warning(f"Vector dimension mismatch: {len(a)} vs {len(b)}")
                return 0.0
            
            # Calculate cosine similarity using scipy (handles edge cases)
            similarity = 1 - cosine(a, b)
            
            # Handle NaN or inf cases
            if math.isnan(similarity) or math.isinf(similarity):
                return 0.0
            
            # Ensure result is in [0, 1] range
            similarity = max(0.0, min(1.0, similarity))
            
            self.stats["similarities_calculated"] += 1
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0
    
    def batch_cosine_similarity(
        self, 
        query_vector: List[float], 
        candidate_vectors: List[List[float]]
    ) -> List[float]:
        """
        Calculate cosine similarity between a query vector and multiple candidates
        
        Args:
            query_vector: Query vector to compare against
            candidate_vectors: List of candidate vectors
            
        Returns:
            List of similarity scores in the same order as candidates
        """
        if not candidate_vectors:
            return []
        
        try:
            # Convert to numpy arrays for efficient computation
            query = np.array(query_vector, dtype=np.float32)
            candidates = np.array(candidate_vectors, dtype=np.float32)
            
            # Validate dimensions
            if len(query) == 0:
                return [0.0] * len(candidate_vectors)
            
            if candidates.shape[1] != len(query):
                logger.warning(f"Dimension mismatch: query={len(query)}, candidates={candidates.shape[1]}")
                return [0.0] * len(candidate_vectors)
            
            # Calculate similarities efficiently
            similarities = []
            for candidate in candidates:
                similarity = self.cosine_similarity(query.tolist(), candidate.tolist())
                similarities.append(similarity)
            
            self.stats["batch_calculations"] += 1
            
            return similarities
            
        except Exception as e:
            logger.error(f"Error in batch cosine similarity: {e}")
            return [0.0] * len(candidate_vectors)
    
    def semantic_similarity(
        self,
        book_a: Dict[str, Any],
        book_b: Dict[str, Any],
        weights: Optional[Dict[str, float]] = None
    ) -> float:
        """
        Calculate semantic similarity between two books using multiple factors
        
        Args:
            book_a: First book data
            book_b: Second book data
            weights: Optional weights for different similarity components
            
        Returns:
            Combined semantic similarity score (0-1)
        """
        if weights is None:
            weights = {
                "embedding": 0.6,      # Primary content similarity
                "category": 0.2,       # Category match
                "author": 0.1,         # Same author bonus
                "tags": 0.1           # Tag overlap
            }
        
        total_similarity = 0.0
        total_weight = 0.0
        
        try:
            # Embedding similarity (primary factor)
            if "embedding" in book_a and "embedding" in book_b:
                embedding_sim = self.cosine_similarity(
                    book_a["embedding"],
                    book_b["embedding"]
                )
                total_similarity += embedding_sim * weights["embedding"]
                total_weight += weights["embedding"]
            
            # Category similarity
            if "category" in book_a and "category" in book_b:
                category_sim = self.category_similarity(
                    book_a["category"],
                    book_b["category"]
                )
                total_similarity += category_sim * weights["category"]
                total_weight += weights["category"]
            
            # Author similarity
            if "author" in book_a and "author" in book_b:
                author_sim = self.author_similarity(
                    book_a["author"],
                    book_b["author"]
                )
                total_similarity += author_sim * weights["author"]
                total_weight += weights["author"]
            
            # Tag similarity
            if "tags" in book_a and "tags" in book_b:
                tags_sim = self.tags_similarity(
                    book_a["tags"],
                    book_b["tags"]
                )
                total_similarity += tags_sim * weights["tags"]
                total_weight += weights["tags"]
            
            # Normalize by total weight
            if total_weight > 0:
                return total_similarity / total_weight
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {e}")
            return 0.0
    
    def category_similarity(self, category_a: str, category_b: str) -> float:
        """Calculate similarity between book categories"""
        if not category_a or not category_b:
            return 0.0
        
        # Exact match
        if category_a.lower() == category_b.lower():
            return 1.0
        
        # Partial match for related categories
        category_relations = {
            "information technology": ["computer", "networking", "internet"],
            "learning": ["education", "tutorial", "guide"],
            "fiction": ["novel", "story"],
            "non-fiction": ["biography", "history", "science"]
        }
        
        cat_a_lower = category_a.lower()
        cat_b_lower = category_b.lower()
        
        for main_category, related in category_relations.items():
            if (cat_a_lower == main_category and cat_b_lower in related) or \
               (cat_b_lower == main_category and cat_a_lower in related):
                return 0.7
            
            if cat_a_lower in related and cat_b_lower in related:
                return 0.6
        
        return 0.0
    
    def author_similarity(self, author_a: str, author_b: str) -> float:
        """Calculate similarity between book authors"""
        if not author_a or not author_b:
            return 0.0
        
        # Exact match
        if author_a.lower() == author_b.lower():
            return 1.0
        
        # Partial name match (useful for variations in Myanmar names)
        words_a = set(author_a.lower().split())
        words_b = set(author_b.lower().split())
        
        if words_a & words_b:  # Has common words
            overlap = len(words_a & words_b)
            total = len(words_a | words_b)
            return overlap / total if total > 0 else 0.0
        
        return 0.0
    
    def tags_similarity(self, tags_a: List[str], tags_b: List[str]) -> float:
        """Calculate similarity between book tags"""
        if not tags_a or not tags_b:
            return 0.0
        
        # Convert to sets for comparison
        set_a = set(tag.lower() for tag in tags_a)
        set_b = set(tag.lower() for tag in tags_b)
        
        # Jaccard similarity
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def rank_by_similarity(
        self,
        query_vector: List[float],
        candidates: List[Dict[str, Any]],
        top_k: int = 10,
        min_similarity: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Rank candidates by similarity to query vector
        
        Args:
            query_vector: Query vector to compare against
            candidates: List of candidate items with embeddings
            top_k: Number of top results to return
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of ranked candidates with similarity scores
        """
        if not candidates:
            return []
        
        try:
            scored_candidates = []
            
            for candidate in candidates:
                if "embedding" not in candidate:
                    continue
                
                similarity = self.cosine_similarity(
                    query_vector,
                    candidate["embedding"]
                )
                
                if similarity >= min_similarity:
                    candidate_copy = candidate.copy()
                    candidate_copy["similarity_score"] = similarity
                    scored_candidates.append(candidate_copy)
            
            # Sort by similarity score (descending)
            scored_candidates.sort(
                key=lambda x: x["similarity_score"],
                reverse=True
            )
            
            return scored_candidates[:top_k]
            
        except Exception as e:
            logger.error(f"Error ranking by similarity: {e}")
            return []
    
    def diversify_results(
        self,
        candidates: List[Dict[str, Any]],
        diversity_factor: float = 0.3,
        max_per_category: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Diversify recommendation results to avoid over-clustering
        
        Args:
            candidates: List of candidates with similarity scores
            diversity_factor: Factor for balancing similarity vs diversity (0-1)
            max_per_category: Maximum items per category
            
        Returns:
            Diversified list of candidates
        """
        if not candidates:
            return candidates
        
        try:
            # Group by category
            category_groups = {}
            for candidate in candidates:
                category = candidate.get("category", "uncategorized")
                if category not in category_groups:
                    category_groups[category] = []
                category_groups[category].append(candidate)
            
            # Select diverse results
            diversified = []
            remaining_slots = len(candidates)
            
            # First pass: take top items from each category
            while remaining_slots > 0 and any(category_groups.values()):
                added_in_round = 0
                
                for category, items in category_groups.items():
                    if not items or remaining_slots <= 0:
                        continue
                    
                    # Take the highest scoring item from this category
                    best_item = max(items, key=lambda x: x.get("similarity_score", 0))
                    diversified.append(best_item)
                    items.remove(best_item)
                    
                    remaining_slots -= 1
                    added_in_round += 1
                    
                    # Respect max_per_category limit
                    category_count = sum(
                        1 for item in diversified 
                        if item.get("category") == category
                    )
                    if category_count >= max_per_category:
                        category_groups[category] = []
                
                # If no items were added in this round, break to avoid infinite loop
                if added_in_round == 0:
                    break
            
            # Sort final results by similarity score
            diversified.sort(
                key=lambda x: x.get("similarity_score", 0),
                reverse=True
            )
            
            return diversified
            
        except Exception as e:
            logger.error(f"Error diversifying results: {e}")
            return candidates
    
    def calculate_user_book_affinity(
        self,
        user_profile: Dict[str, Any],
        book: Dict[str, Any]
    ) -> float:
        """
        Calculate affinity between a user profile and a book
        
        Args:
            user_profile: User preference profile
            book: Book data
            
        Returns:
            Affinity score (0-1)
        """
        try:
            affinity_score = 0.0
            total_factors = 0
            
            # Content similarity
            if "preference_embedding" in user_profile and "embedding" in book:
                content_sim = self.cosine_similarity(
                    user_profile["preference_embedding"],
                    book["embedding"]
                )
                affinity_score += content_sim * 0.5
                total_factors += 0.5
            
            # Category preference
            if "favorite_categories" in user_profile and "category" in book:
                category_match = 0.0
                book_category = book["category"].lower()
                
                for fav_category in user_profile["favorite_categories"]:
                    if fav_category.lower() == book_category:
                        category_match = 1.0
                        break
                    elif fav_category.lower() in book_category or book_category in fav_category.lower():
                        category_match = max(category_match, 0.7)
                
                affinity_score += category_match * 0.3
                total_factors += 0.3
            
            # Author preference
            if "favorite_authors" in user_profile and "author" in book:
                author_match = 0.0
                book_author = book["author"].lower()
                
                for fav_author in user_profile["favorite_authors"]:
                    if fav_author.lower() == book_author:
                        author_match = 1.0
                        break
                    elif fav_author.lower() in book_author or book_author in fav_author.lower():
                        author_match = max(author_match, 0.8)
                
                affinity_score += author_match * 0.2
                total_factors += 0.2
            
            # Normalize by total factors
            if total_factors > 0:
                return affinity_score / total_factors
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Error calculating user-book affinity: {e}")
            return 0.0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get similarity engine statistics"""
        return self.stats.copy()