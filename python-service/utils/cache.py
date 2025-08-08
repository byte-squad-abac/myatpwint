"""
Cache Manager - Redis-based caching for recommendation system
"""

import json
import logging
import asyncio
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
import hashlib

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

class InMemoryCache:
    """
    Simple in-memory cache implementation as fallback
    """
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.access_times: Dict[str, datetime] = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self.cache:
            entry = self.cache[key]
            if entry['expires_at'] > datetime.now():
                self.access_times[key] = datetime.now()
                return entry['value']
            else:
                # Expired
                await self.delete(key)
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        try:
            # Evict old entries if cache is full
            if len(self.cache) >= self.max_size:
                await self._evict_oldest()
            
            self.cache[key] = {
                'value': value,
                'expires_at': datetime.now() + timedelta(seconds=ttl),
                'created_at': datetime.now()
            }
            self.access_times[key] = datetime.now()
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self.cache:
            del self.cache[key]
            self.access_times.pop(key, None)
            return True
        return False
    
    async def clear(self) -> bool:
        """Clear all cache entries"""
        self.cache.clear()
        self.access_times.clear()
        return True
    
    async def exists(self, key: str) -> bool:
        """Check if key exists and is not expired"""
        return await self.get(key) is not None
    
    async def _evict_oldest(self):
        """Evict oldest accessed entries"""
        if not self.access_times:
            return
        
        # Sort by access time and remove oldest 10%
        sorted_keys = sorted(self.access_times.items(), key=lambda x: x[1])
        keys_to_remove = [key for key, _ in sorted_keys[:max(1, len(sorted_keys) // 10)]]
        
        for key in keys_to_remove:
            await self.delete(key)

class RedisCache:
    """
    Redis-based cache implementation
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379", prefix: str = "rec_cache:"):
        self.redis_url = redis_url
        self.prefix = prefix
        self.client: Optional[redis.Redis] = None
        self.connected = False
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.client = redis.from_url(self.redis_url, decode_responses=True)
            # Test connection
            await self.client.ping()
            self.connected = True
            logger.info("✅ Connected to Redis cache")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            self.connected = False
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.client:
            await self.client.close()
            self.connected = False
    
    def _make_key(self, key: str) -> str:
        """Add prefix to cache key"""
        return f"{self.prefix}{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache"""
        if not self.connected or not self.client:
            return None
        
        try:
            cached_data = await self.client.get(self._make_key(key))
            if cached_data:
                return json.loads(cached_data)
            return None
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in Redis cache with TTL"""
        if not self.connected or not self.client:
            return False
        
        try:
            serialized_value = json.dumps(value, default=str)
            await self.client.setex(self._make_key(key), ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from Redis cache"""
        if not self.connected or not self.client:
            return False
        
        try:
            result = await self.client.delete(self._make_key(key))
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    async def clear(self, pattern: str = "*") -> bool:
        """Clear cache entries matching pattern"""
        if not self.connected or not self.client:
            return False
        
        try:
            keys = await self.client.keys(self._make_key(pattern))
            if keys:
                await self.client.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Error clearing cache with pattern {pattern}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis"""
        if not self.connected or not self.client:
            return False
        
        try:
            result = await self.client.exists(self._make_key(key))
            return result > 0
        except Exception as e:
            logger.error(f"Error checking existence of key {key}: {e}")
            return False

class CacheManager:
    """
    Unified cache manager that can use Redis or in-memory cache
    """
    
    def __init__(self, redis_url: Optional[str] = None, use_redis: bool = True):
        self.use_redis = use_redis and REDIS_AVAILABLE and redis_url
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
        
        if self.use_redis:
            self.cache = RedisCache(redis_url)
        else:
            self.cache = InMemoryCache()
            if not REDIS_AVAILABLE:
                logger.warning("⚠️ Redis not available, using in-memory cache")
    
    async def initialize(self):
        """Initialize the cache"""
        if self.use_redis:
            await self.cache.connect()
        logger.info(f"🔄 Cache manager initialized ({'Redis' if self.use_redis else 'In-Memory'})")
    
    async def cleanup(self):
        """Cleanup cache resources"""
        if self.use_redis:
            await self.cache.disconnect()
    
    def _generate_cache_key(self, base_key: str, **params) -> str:
        """Generate consistent cache key from base key and parameters"""
        if not params:
            return base_key
        
        # Sort parameters for consistent key generation
        sorted_params = sorted(params.items())
        param_string = "&".join([f"{k}={v}" for k, v in sorted_params])
        
        # Hash long parameter strings to keep keys manageable
        if len(param_string) > 100:
            param_hash = hashlib.md5(param_string.encode()).hexdigest()
            return f"{base_key}:{param_hash}"
        
        return f"{base_key}:{param_string}"
    
    async def get(self, key: str, **params) -> Optional[Any]:
        """Get value from cache"""
        cache_key = self._generate_cache_key(key, **params)
        
        try:
            result = await self.cache.get(cache_key)
            if result is not None:
                self.stats['hits'] += 1
                logger.debug(f"💾 Cache HIT: {cache_key}")
                return result
            else:
                self.stats['misses'] += 1
                logger.debug(f"💾 Cache MISS: {cache_key}")
                return None
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Cache get error for key {cache_key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600, **params) -> bool:
        """Set value in cache"""
        cache_key = self._generate_cache_key(key, **params)
        
        try:
            result = await self.cache.set(cache_key, value, ttl)
            if result:
                self.stats['sets'] += 1
                logger.debug(f"💾 Cache SET: {cache_key} (TTL: {ttl}s)")
            return result
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Cache set error for key {cache_key}: {e}")
            return False
    
    async def delete(self, key: str, **params) -> bool:
        """Delete value from cache"""
        cache_key = self._generate_cache_key(key, **params)
        
        try:
            result = await self.cache.delete(cache_key)
            if result:
                self.stats['deletes'] += 1
                logger.debug(f"💾 Cache DELETE: {cache_key}")
            return result
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Cache delete error for key {cache_key}: {e}")
            return False
    
    async def exists(self, key: str, **params) -> bool:
        """Check if key exists in cache"""
        cache_key = self._generate_cache_key(key, **params)
        
        try:
            return await self.cache.exists(cache_key)
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Cache exists error for key {cache_key}: {e}")
            return False
    
    async def clear(self, pattern: str = "*") -> bool:
        """Clear cache entries matching pattern"""
        try:
            result = await self.cache.clear(pattern)
            logger.info(f"🧹 Cache cleared with pattern: {pattern}")
            return result
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Cache clear error with pattern {pattern}: {e}")
            return False
    
    # Specialized cache methods for recommendations
    
    async def cache_book_embedding(self, book_id: str, embedding: List[float], ttl: int = 86400):
        """Cache book embedding with long TTL (24 hours)"""
        return await self.set(f"book_embedding", embedding, ttl, book_id=book_id)
    
    async def get_book_embedding(self, book_id: str) -> Optional[List[float]]:
        """Get cached book embedding"""
        return await self.get(f"book_embedding", book_id=book_id)
    
    async def cache_user_profile(self, user_id: str, profile: Dict[str, Any], ttl: int = 3600):
        """Cache user profile with medium TTL (1 hour)"""
        return await self.set(f"user_profile", profile, ttl, user_id=user_id)
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached user profile"""
        return await self.get(f"user_profile", user_id=user_id)
    
    async def cache_recommendations(
        self, 
        user_id: str, 
        rec_type: str, 
        recommendations: List[Dict[str, Any]], 
        ttl: int = 1800
    ):
        """Cache recommendations with short TTL (30 minutes)"""
        return await self.set(
            f"recommendations", 
            recommendations, 
            ttl, 
            user_id=user_id, 
            type=rec_type
        )
    
    async def get_recommendations(
        self, 
        user_id: str, 
        rec_type: str
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached recommendations"""
        return await self.get(f"recommendations", user_id=user_id, type=rec_type)
    
    async def cache_book_similarities(
        self, 
        book_id: str, 
        similarities: List[Dict[str, Any]], 
        ttl: int = 7200
    ):
        """Cache book similarities with medium TTL (2 hours)"""
        return await self.set(f"book_similarities", similarities, ttl, book_id=book_id)
    
    async def get_book_similarities(self, book_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached book similarities"""
        return await self.get(f"book_similarities", book_id=book_id)
    
    async def invalidate_user_cache(self, user_id: str):
        """Invalidate all cache entries for a user"""
        patterns = [
            f"user_profile:*user_id={user_id}*",
            f"recommendations:*user_id={user_id}*"
        ]
        
        for pattern in patterns:
            await self.clear(pattern)
        
        logger.info(f"🧹 Invalidated cache for user: {user_id}")
    
    async def invalidate_book_cache(self, book_id: str):
        """Invalidate all cache entries for a book"""
        patterns = [
            f"book_embedding:*book_id={book_id}*",
            f"book_similarities:*book_id={book_id}*"
        ]
        
        for pattern in patterns:
            await self.clear(pattern)
        
        logger.info(f"🧹 Invalidated cache for book: {book_id}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_operations = sum(self.stats.values())
        hit_rate = self.stats['hits'] / (self.stats['hits'] + self.stats['misses']) if (self.stats['hits'] + self.stats['misses']) > 0 else 0
        
        return {
            **self.stats,
            'total_operations': total_operations,
            'hit_rate': hit_rate,
            'cache_type': 'Redis' if self.use_redis else 'In-Memory'
        }
    
    def reset_stats(self):
        """Reset cache statistics"""
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }