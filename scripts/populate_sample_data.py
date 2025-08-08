#!/usr/bin/env python3
"""
Sample Data Population Script for AI Recommendation System
Creates sample books, generates embeddings, and populates the recommendation system with test data.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
import random
from typing import List, Dict, Any

import httpx
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PYTHON_SERVICE_URL = os.getenv("PYTHON_SERVICE_URL", "http://localhost:8000")

# Sample Myanmar and English books data
SAMPLE_BOOKS = [
    # Myanmar Literature
    {
        "name": "Thawda Hmawt (First Love)",
        "author": "Thukha",
        "description": "A classic Myanmar romance novel about young love and the challenges of traditional society. Set in colonial Burma, it explores themes of love, duty, and social change.",
        "category": "Romance",
        "price": 25000,  # MMK
        "tags": ["classic", "romance", "myanmar", "colonial", "traditional"],
        "language": "myanmar"
    },
    {
        "name": "Yazar Thingyan",
        "author": "Zawgyi",
        "description": "A profound Myanmar novel exploring the depths of human nature and spirituality during the Thingyan festival. A masterpiece of Myanmar literature.",
        "category": "Fiction",
        "price": 30000,
        "tags": ["literature", "spirituality", "festival", "philosophical", "cultural"],
        "language": "myanmar"
    },
    {
        "name": "Ngar Par Yar (Night Market)",
        "author": "Ma Sandar",
        "description": "A vivid portrayal of life in Myanmar's bustling night markets. Stories of vendors, customers, and the human drama that unfolds after dark.",
        "category": "Fiction",
        "price": 20000,
        "tags": ["urban", "social", "market", "contemporary", "slice-of-life"],
        "language": "myanmar"
    },
    {
        "name": "Kabar Ma Kyay Buu (I Will Not Say the Word)",
        "author": "Nu Nu Yi",
        "description": "A powerful story about women's struggles in traditional Myanmar society. A feminist perspective on love, family, and personal freedom.",
        "category": "Contemporary Fiction",
        "price": 28000,
        "tags": ["feminist", "women", "society", "freedom", "contemporary"],
        "language": "myanmar"
    },
    
    # English Fiction
    {
        "name": "The Bamboo Garden",
        "author": "Sarah Mitchell",
        "description": "A beautiful tale set in colonial Myanmar, following the friendship between a British girl and a local Myanmar family. Explores themes of cultural exchange and understanding.",
        "category": "Historical Fiction",
        "price": 35000,
        "tags": ["historical", "colonial", "friendship", "cultural", "british"],
        "language": "english"
    },
    {
        "name": "Golden Pagoda Mysteries",
        "author": "David Chen",
        "description": "A thrilling mystery series set in modern Yangon. Detective Khin Maung investigates crimes while navigating the complexities of modern Myanmar.",
        "category": "Mystery",
        "price": 32000,
        "tags": ["mystery", "detective", "yangon", "crime", "modern"],
        "language": "english"
    },
    {
        "name": "Monsoon Dreams",
        "author": "Thida Aung",
        "description": "A sweeping romance spanning three generations of a Myanmar family. From colonial times to modern day, love endures through political upheaval.",
        "category": "Romance",
        "price": 29000,
        "tags": ["multi-generation", "political", "romance", "family", "historical"],
        "language": "english"
    },
    {
        "name": "The Last Elephant Mahout",
        "author": "James Harrison",
        "description": "The story of Myanmar's last traditional elephant mahout and his struggle to preserve ancient traditions in a modernizing world.",
        "category": "Non-Fiction",
        "price": 40000,
        "tags": ["elephants", "tradition", "culture", "environment", "biography"],
        "language": "english"
    },
    
    # Business & Self-Help
    {
        "name": "Myanmar Entrepreneur's Guide",
        "author": "Khin Mg Mg",
        "description": "A practical guide to starting and running a business in Myanmar. Includes case studies, legal advice, and cultural insights.",
        "category": "Business",
        "price": 45000,
        "tags": ["entrepreneurship", "business", "startup", "legal", "practical"],
        "language": "english"
    },
    {
        "name": "Mindfulness in the Golden Land",
        "author": "Venerable Ashin Pyinnya",
        "description": "Buddhist meditation and mindfulness practices adapted for modern life. Ancient wisdom for contemporary challenges.",
        "category": "Self-Help",
        "price": 25000,
        "tags": ["mindfulness", "buddhism", "meditation", "spirituality", "wisdom"],
        "language": "english"
    },
    
    # Technology & Education
    {
        "name": "Python Programming for Myanmar Students",
        "author": "Mg Thura",
        "description": "Learn Python programming with examples relevant to Myanmar context. Perfect for students and beginners.",
        "category": "Technology",
        "price": 38000,
        "tags": ["programming", "python", "education", "students", "technology"],
        "language": "english"
    },
    {
        "name": "Digital Marketing in Southeast Asia",
        "author": "Lisa Wong",
        "description": "Comprehensive guide to digital marketing strategies specifically for Southeast Asian markets, including Myanmar.",
        "category": "Business",
        "price": 42000,
        "tags": ["digital", "marketing", "southeast-asia", "online", "strategy"],
        "language": "english"
    },
    
    # Children's Books
    {
        "name": "The Adventures of Little Thura",
        "author": "Daw Khin Khin",
        "description": "Delightful children's stories featuring Little Thura and his adventures in Myanmar villages. Teaches values and cultural traditions.",
        "category": "Children",
        "price": 15000,
        "tags": ["children", "adventure", "village", "values", "traditional"],
        "language": "myanmar"
    },
    {
        "name": "Learn English with Maung Maung",
        "author": "Teacher Mary",
        "description": "Fun English learning book for Myanmar children. Interactive stories and exercises to build language skills.",
        "category": "Education",
        "price": 18000,
        "tags": ["education", "english", "children", "language", "interactive"],
        "language": "bilingual"
    },
    
    # Health & Cooking
    {
        "name": "Traditional Myanmar Medicine",
        "author": "Dr. Thant Zin",
        "description": "Comprehensive guide to traditional Myanmar herbal medicine and healing practices. Modern research meets ancient wisdom.",
        "category": "Health",
        "price": 35000,
        "tags": ["medicine", "herbal", "traditional", "health", "healing"],
        "language": "english"
    },
    {
        "name": "Myanmar Kitchen Classics",
        "author": "Chef Thida",
        "description": "Authentic recipes from all regions of Myanmar. From street food to royal cuisine, master the art of Myanmar cooking.",
        "category": "Cooking",
        "price": 30000,
        "tags": ["cooking", "recipes", "food", "regional", "authentic"],
        "language": "english"
    }
]

# Sample user interaction data for generating realistic analytics
SAMPLE_USERS = [
    {"id": "user1", "name": "Aung Aung", "interests": ["romance", "traditional", "myanmar"]},
    {"id": "user2", "name": "Su Su", "interests": ["mystery", "modern", "crime"]},
    {"id": "user3", "name": "Thura", "interests": ["business", "technology", "education"]},
    {"id": "user4", "name": "Mya Mya", "interests": ["cooking", "health", "traditional"]},
    {"id": "user5", "name": "Kyaw Kyaw", "interests": ["fiction", "historical", "literature"]},
]

class DataPopulator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.model = None
        self.books_created = []
        
    async def initialize_model(self):
        """Initialize the sentence transformer model"""
        logger.info("Loading sentence transformer model...")
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        logger.info("Model loaded successfully")
    
    def generate_book_embedding(self, book_data: Dict[str, Any]) -> List[float]:
        """Generate embedding for a book"""
        text_parts = []
        if book_data.get('name'):
            text_parts.append(f"Title: {book_data['name']}")
        if book_data.get('author'):
            text_parts.append(f"Author: {book_data['author']}")
        if book_data.get('description'):
            text_parts.append(f"Description: {book_data['description']}")
        if book_data.get('category'):
            text_parts.append(f"Category: {book_data['category']}")
        if book_data.get('tags'):
            text_parts.append(f"Tags: {', '.join(book_data['tags'])}")
        
        combined_text = '. '.join(text_parts)
        embedding = self.model.encode(combined_text)
        return embedding.tolist()
    
    async def create_sample_books(self):
        """Create sample books in the database"""
        logger.info("Creating sample books...")
        
        for book_data in SAMPLE_BOOKS:
            try:
                # Insert book
                book_result = self.supabase.table("books").insert({
                    "name": book_data["name"],
                    "author": book_data["author"],
                    "description": book_data["description"],
                    "category": book_data["category"],
                    "price": book_data["price"],
                    "tags": json.dumps(book_data["tags"]),
                    "published_date": (datetime.now() - timedelta(days=random.randint(30, 365))).isoformat(),
                    "edition": "1st Edition",
                    "image_url": f"https://picsum.photos/300/400?random={random.randint(1, 1000)}",
                    "created_at": datetime.now().isoformat()
                }).execute()
                
                if book_result.data:
                    book = book_result.data[0]
                    self.books_created.append(book)
                    logger.info(f"Created book: {book['name']} (ID: {book['id']})")
                    
                    # Generate and store embedding
                    embedding = self.generate_book_embedding(book_data)
                    
                    embedding_result = self.supabase.table("book_embeddings").insert({
                        "book_id": book["id"],
                        "embedding_vector": embedding,
                        "model_version": "paraphrase-multilingual-MiniLM-L12-v2",
                        "text_hash": str(hash(book_data["description"])),
                        "metadata": {
                            "language": book_data.get("language", "english"),
                            "embedding_dimension": len(embedding)
                        }
                    }).execute()
                    
                    if embedding_result.data:
                        logger.info(f"Created embedding for book: {book['name']}")
                    
            except Exception as e:
                logger.error(f"Error creating book {book_data['name']}: {e}")
    
    async def generate_sample_interactions(self):
        """Generate realistic user interactions for analytics"""
        logger.info("Generating sample user interactions...")
        
        interaction_types = ['view', 'click', 'add_to_cart', 'purchase']
        recommendation_types = ['similar', 'personalized', 'trending', 'search']
        
        # Generate interactions for the past 30 days
        for day in range(30):
            date = datetime.now() - timedelta(days=day)
            
            # Generate 20-50 interactions per day
            num_interactions = random.randint(20, 50)
            
            for _ in range(num_interactions):
                user = random.choice(SAMPLE_USERS)
                book = random.choice(self.books_created)
                interaction_type = random.choice(interaction_types)
                rec_type = random.choice(recommendation_types)
                
                # Weight interactions based on user interests
                book_tags = json.loads(book.get('tags', '[]'))
                relevance_score = len(set(user['interests']).intersection(set(book_tags)))
                
                # Higher relevance = more likely to interact
                if random.random() > (0.3 + relevance_score * 0.2):
                    continue
                
                # Generate similarity score based on relevance
                similarity_score = 0.3 + (relevance_score * 0.2) + random.uniform(0, 0.3)
                
                try:
                    self.supabase.table("recommendation_interactions").insert({
                        "user_id": user["id"],
                        "book_id": book["id"],
                        "interaction_type": interaction_type,
                        "recommendation_type": rec_type,
                        "algorithm_version": "v1.0",
                        "similarity_score": similarity_score,
                        "metadata": {
                            "user_interests": user["interests"],
                            "book_tags": book_tags,
                            "relevance_score": relevance_score
                        },
                        "created_at": date.isoformat()
                    }).execute()
                    
                except Exception as e:
                    logger.error(f"Error creating interaction: {e}")
    
    async def generate_search_analytics(self):
        """Generate sample search analytics data"""
        logger.info("Generating sample search analytics...")
        
        search_queries = [
            "love story", "myanmar culture", "business guide", "cooking recipes",
            "historical fiction", "mystery novel", "self improvement", "technology",
            "traditional medicine", "children stories", "romance", "thriller",
            "entrepreneurship", "mindfulness", "python programming", "marketing"
        ]
        
        algorithms = ["semantic_search", "traditional_search"]
        
        for day in range(30):
            date = datetime.now() - timedelta(days=day)
            
            # Generate 10-30 searches per day
            num_searches = random.randint(10, 30)
            
            for _ in range(num_searches):
                query = random.choice(search_queries)
                algorithm = random.choice(algorithms)
                
                # Semantic search generally returns more results
                results_count = random.randint(5, 15) if algorithm == "semantic_search" else random.randint(0, 8)
                
                # Sometimes users click on results
                clicked_book = None
                click_position = None
                if results_count > 0 and random.random() < 0.4:  # 40% click rate
                    clicked_book = random.choice(self.books_created)["id"]
                    click_position = random.randint(0, min(4, results_count - 1))
                
                try:
                    self.supabase.table("search_analytics").insert({
                        "user_id": random.choice(SAMPLE_USERS)["id"] if random.random() < 0.7 else None,
                        "query": query,
                        "algorithm": algorithm,
                        "results_count": results_count,
                        "clicked_book_id": clicked_book,
                        "click_position": click_position,
                        "session_id": f"sess_{date.strftime('%Y%m%d')}_{random.randint(1000, 9999)}",
                        "timestamp": date.isoformat()
                    }).execute()
                    
                except Exception as e:
                    logger.error(f"Error creating search analytics: {e}")
    
    async def test_python_service_integration(self):
        """Test integration with Python service"""
        logger.info("Testing Python service integration...")
        
        if not self.books_created:
            logger.warning("No books created, skipping Python service test")
            return
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test health endpoint
                health_response = await client.get(f"{PYTHON_SERVICE_URL}/health")
                if health_response.status_code == 200:
                    logger.info("✅ Python service health check passed")
                else:
                    logger.warning("⚠️ Python service health check failed")
                    return
                
                # Test book processing
                test_book = self.books_created[0]
                process_response = await client.post(f"{PYTHON_SERVICE_URL}/books/process", json={
                    "book": {
                        "id": test_book["id"],
                        "name": test_book["name"],
                        "author": test_book["author"],
                        "description": test_book["description"],
                        "category": test_book["category"],
                        "tags": json.loads(test_book.get("tags", "[]")),
                        "price": test_book["price"]
                    },
                    "generate_embedding": True,
                    "update_cache": False
                })
                
                if process_response.status_code == 200:
                    logger.info("✅ Book processing test passed")
                else:
                    logger.warning(f"⚠️ Book processing test failed: {process_response.text}")
                
                # Test similar recommendations
                similar_response = await client.post(f"{PYTHON_SERVICE_URL}/recommendations/similar", json={
                    "book_id": test_book["id"],
                    "limit": 5,
                    "min_similarity": 0.3
                })
                
                if similar_response.status_code == 200:
                    result = similar_response.json()
                    logger.info(f"✅ Similar recommendations test passed: {len(result.get('recommendations', []))} results")
                else:
                    logger.warning(f"⚠️ Similar recommendations test failed: {similar_response.text}")
        
        except Exception as e:
            logger.error(f"Error testing Python service: {e}")
    
    async def test_api_endpoints(self):
        """Test Next.js API endpoints"""
        logger.info("Testing Next.js API endpoints...")
        
        if not self.books_created:
            logger.warning("No books created, skipping API test")
            return
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                base_url = "http://localhost:3000"  # Adjust if different
                test_book = self.books_created[0]
                
                # Test similar books API
                similar_response = await client.get(
                    f"{base_url}/api/recommendations/similar?bookId={test_book['id']}&limit=5"
                )
                if similar_response.status_code == 200:
                    logger.info("✅ Similar books API test passed")
                else:
                    logger.warning(f"⚠️ Similar books API test failed: {similar_response.text}")
                
                # Test trending books API
                trending_response = await client.get(
                    f"{base_url}/api/recommendations/trending?limit=5&timeWindow=30"
                )
                if trending_response.status_code == 200:
                    logger.info("✅ Trending books API test passed")
                else:
                    logger.warning(f"⚠️ Trending books API test failed: {trending_response.text}")
                
                # Test search API
                search_response = await client.get(
                    f"{base_url}/api/recommendations/search?query=love%20story&limit=5"
                )
                if search_response.status_code == 200:
                    logger.info("✅ Search API test passed")
                else:
                    logger.warning(f"⚠️ Search API test failed: {search_response.text}")
        
        except Exception as e:
            logger.error(f"Error testing API endpoints: {e}")
    
    async def run_population(self):
        """Run the complete data population process"""
        logger.info("🚀 Starting sample data population for AI Recommendation System")
        
        try:
            # Initialize model
            await self.initialize_model()
            
            # Create sample books with embeddings
            await self.create_sample_books()
            
            # Generate realistic user interactions
            await self.generate_sample_interactions()
            
            # Generate search analytics
            await self.generate_search_analytics()
            
            # Test system integration
            await self.test_python_service_integration()
            await self.test_api_endpoints()
            
            logger.info(f"✅ Data population completed successfully!")
            logger.info(f"📚 Created {len(self.books_created)} books")
            logger.info(f"🧠 Generated embeddings for all books")
            logger.info(f"📊 Generated analytics data for the past 30 days")
            logger.info("\n🎉 Your AI-powered recommendation system is ready to use!")
            
        except Exception as e:
            logger.error(f"❌ Error during data population: {e}")
            raise

async def main():
    """Main function"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        return
    
    populator = DataPopulator()
    await populator.run_population()

if __name__ == "__main__":
    asyncio.run(main())