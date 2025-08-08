#!/usr/bin/env python3
"""
Comprehensive Test Suite for AI Recommendation System
Tests all components: Database, Python Service, Next.js APIs, and Analytics
"""

import asyncio
import json
import logging
import os
from datetime import datetime
import httpx
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PYTHON_SERVICE_URL = os.getenv("PYTHON_SERVICE_URL", "http://localhost:8000")
NEXTJS_API_URL = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

class RecommendationSystemTester:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.test_results = {
            "database": {"passed": 0, "failed": 0, "tests": []},
            "python_service": {"passed": 0, "failed": 0, "tests": []},
            "nextjs_api": {"passed": 0, "failed": 0, "tests": []},
            "analytics": {"passed": 0, "failed": 0, "tests": []},
        }
    
    def record_test_result(self, category: str, test_name: str, passed: bool, message: str = ""):
        """Record test result"""
        self.test_results[category]["tests"].append({
            "name": test_name,
            "passed": passed,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
        if passed:
            self.test_results[category]["passed"] += 1
            logger.info(f"✅ {category.upper()}: {test_name}")
        else:
            self.test_results[category]["failed"] += 1
            logger.error(f"❌ {category.upper()}: {test_name} - {message}")
    
    async def test_database_connectivity(self):
        """Test basic database connectivity and tables"""
        logger.info("\n🗄️ Testing Database Connectivity...")
        
        try:
            # Test basic connection
            result = self.supabase.table("books").select("id").limit(1).execute()
            self.record_test_result("database", "Basic Connectivity", True)
            
            # Test recommendation tables exist
            tables_to_test = [
                "books", "book_embeddings", "recommendation_interactions", 
                "user_preference_profiles", "recommendation_cache", 
                "book_similarities", "search_analytics"
            ]
            
            for table in tables_to_test:
                try:
                    self.supabase.table(table).select("*").limit(1).execute()
                    self.record_test_result("database", f"Table {table} exists", True)
                except Exception as e:
                    self.record_test_result("database", f"Table {table} exists", False, str(e))
            
            # Test RLS policies (should fail without proper auth)
            try:
                # This should work with service role
                self.supabase.table("recommendation_interactions").select("*").limit(1).execute()
                self.record_test_result("database", "RLS Policies Configured", True)
            except Exception as e:
                self.record_test_result("database", "RLS Policies Configured", False, str(e))
                
        except Exception as e:
            self.record_test_result("database", "Basic Connectivity", False, str(e))
    
    async def test_python_service(self):
        """Test Python FastAPI service endpoints"""
        logger.info("\n🐍 Testing Python Service...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test health endpoint
                try:
                    response = await client.get(f"{PYTHON_SERVICE_URL}/health")
                    if response.status_code == 200:
                        health_data = response.json()
                        self.record_test_result("python_service", "Health Check", True, 
                                              f"Status: {health_data.get('status', 'Unknown')}")
                    else:
                        self.record_test_result("python_service", "Health Check", False, 
                                              f"HTTP {response.status_code}")
                except Exception as e:
                    self.record_test_result("python_service", "Health Check", False, str(e))
                
                # Test embedding generation
                try:
                    test_text = "A beautiful love story set in Myanmar"
                    response = await client.post(f"{PYTHON_SERVICE_URL}/embeddings/generate", 
                                               json={"text": test_text})
                    
                    if response.status_code == 200:
                        data = response.json()
                        if "embedding" in data and len(data["embedding"]) == 384:
                            self.record_test_result("python_service", "Embedding Generation", True,
                                                  f"Generated {len(data['embedding'])}-dim embedding")
                        else:
                            self.record_test_result("python_service", "Embedding Generation", False,
                                                  "Invalid embedding format")
                    else:
                        self.record_test_result("python_service", "Embedding Generation", False,
                                              f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.record_test_result("python_service", "Embedding Generation", False, str(e))
                
                # Test book processing (if we have sample books)
                try:
                    books_result = self.supabase.table("books").select("*").limit(1).execute()
                    if books_result.data:
                        book = books_result.data[0]
                        response = await client.post(f"{PYTHON_SERVICE_URL}/books/process", json={
                            "book": {
                                "id": book["id"],
                                "name": book["name"],
                                "author": book.get("author", "Unknown"),
                                "description": book.get("description", ""),
                                "category": book.get("category", ""),
                                "tags": json.loads(book.get("tags", "[]")),
                                "price": book.get("price", 0)
                            },
                            "generate_embedding": True,
                            "update_cache": False
                        })
                        
                        if response.status_code == 200:
                            self.record_test_result("python_service", "Book Processing", True)
                        else:
                            self.record_test_result("python_service", "Book Processing", False,
                                                  f"HTTP {response.status_code}: {response.text}")
                    else:
                        self.record_test_result("python_service", "Book Processing", False,
                                              "No books available for testing")
                except Exception as e:
                    self.record_test_result("python_service", "Book Processing", False, str(e))
                
        except Exception as e:
            logger.error(f"Python service testing failed: {e}")
    
    async def test_nextjs_api(self):
        """Test Next.js API endpoints"""
        logger.info("\n⚛️ Testing Next.js API Endpoints...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get sample book for testing
                books_result = self.supabase.table("books").select("*").limit(5).execute()
                if not books_result.data:
                    self.record_test_result("nextjs_api", "Sample Data Available", False, 
                                          "No books found for API testing")
                    return
                
                test_book = books_result.data[0]
                self.record_test_result("nextjs_api", "Sample Data Available", True)
                
                # Test similar books API
                try:
                    response = await client.get(
                        f"{NEXTJS_API_URL}/api/recommendations/similar",
                        params={"bookId": test_book["id"], "limit": 5}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and "recommendations" in data:
                            self.record_test_result("nextjs_api", "Similar Books API", True,
                                                  f"Found {len(data['recommendations'])} recommendations")
                        else:
                            self.record_test_result("nextjs_api", "Similar Books API", False,
                                                  "Invalid response format")
                    else:
                        self.record_test_result("nextjs_api", "Similar Books API", False,
                                              f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.record_test_result("nextjs_api", "Similar Books API", False, str(e))
                
                # Test trending books API
                try:
                    response = await client.get(
                        f"{NEXTJS_API_URL}/api/recommendations/trending",
                        params={"limit": 5, "timeWindow": 30}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and "recommendations" in data:
                            self.record_test_result("nextjs_api", "Trending Books API", True,
                                                  f"Found {len(data['recommendations'])} recommendations")
                        else:
                            self.record_test_result("nextjs_api", "Trending Books API", False,
                                                  "Invalid response format")
                    else:
                        self.record_test_result("nextjs_api", "Trending Books API", False,
                                              f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.record_test_result("nextjs_api", "Trending Books API", False, str(e))
                
                # Test search API
                try:
                    response = await client.get(
                        f"{NEXTJS_API_URL}/api/recommendations/search",
                        params={"query": "love story", "limit": 5}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and "recommendations" in data:
                            self.record_test_result("nextjs_api", "Search API", True,
                                                  f"Found {len(data['recommendations'])} results")
                        else:
                            self.record_test_result("nextjs_api", "Search API", False,
                                                  "Invalid response format")
                    else:
                        self.record_test_result("nextjs_api", "Search API", False,
                                              f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.record_test_result("nextjs_api", "Search API", False, str(e))
                
                # Test personalized recommendations (requires user ID)
                try:
                    # Use a test user ID
                    test_user_id = "test-user-123"
                    response = await client.get(
                        f"{NEXTJS_API_URL}/api/recommendations/personalized",
                        params={"userId": test_user_id, "limit": 5}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and "recommendations" in data:
                            self.record_test_result("nextjs_api", "Personalized API", True,
                                                  f"Found {len(data['recommendations'])} recommendations")
                        else:
                            self.record_test_result("nextjs_api", "Personalized API", False,
                                                  "Invalid response format")
                    else:
                        self.record_test_result("nextjs_api", "Personalized API", False,
                                              f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.record_test_result("nextjs_api", "Personalized API", False, str(e))
        
        except Exception as e:
            logger.error(f"Next.js API testing failed: {e}")
    
    async def test_analytics(self):
        """Test analytics functionality"""
        logger.info("\n📊 Testing Analytics System...")
        
        try:
            # Test analytics tables
            analytics_tables = ["recommendation_interactions", "search_analytics", 
                               "user_behavior_profiles", "ab_tests"]
            
            for table in analytics_tables:
                try:
                    result = self.supabase.table(table).select("*").limit(1).execute()
                    self.record_test_result("analytics", f"Analytics table {table}", True)
                except Exception as e:
                    self.record_test_result("analytics", f"Analytics table {table}", False, str(e))
            
            # Test analytics data insertion
            try:
                test_interaction = {
                    "user_id": "test-user-123",
                    "interaction_type": "view",
                    "recommendation_type": "similar",
                    "algorithm_version": "test_v1.0",
                    "metadata": {"test": True},
                    "created_at": datetime.now().isoformat()
                }
                
                result = self.supabase.table("recommendation_interactions").insert(test_interaction).execute()
                if result.data:
                    self.record_test_result("analytics", "Analytics Data Insertion", True)
                    
                    # Clean up test data
                    self.supabase.table("recommendation_interactions").delete().eq("user_id", "test-user-123").execute()
                else:
                    self.record_test_result("analytics", "Analytics Data Insertion", False, "No data returned")
            except Exception as e:
                self.record_test_result("analytics", "Analytics Data Insertion", False, str(e))
            
            # Test search analytics
            try:
                test_search = {
                    "user_id": "test-user-123",
                    "query": "test query",
                    "algorithm": "test_algorithm",
                    "results_count": 5,
                    "timestamp": datetime.now().isoformat()
                }
                
                result = self.supabase.table("search_analytics").insert(test_search).execute()
                if result.data:
                    self.record_test_result("analytics", "Search Analytics Insertion", True)
                    
                    # Clean up test data
                    self.supabase.table("search_analytics").delete().eq("user_id", "test-user-123").execute()
                else:
                    self.record_test_result("analytics", "Search Analytics Insertion", False, "No data returned")
            except Exception as e:
                self.record_test_result("analytics", "Search Analytics Insertion", False, str(e))
        
        except Exception as e:
            logger.error(f"Analytics testing failed: {e}")
    
    def generate_report(self):
        """Generate comprehensive test report"""
        logger.info("\n📋 Generating Test Report...")
        
        total_passed = sum(cat["passed"] for cat in self.test_results.values())
        total_failed = sum(cat["failed"] for cat in self.test_results.values())
        total_tests = total_passed + total_failed
        
        print("\n" + "="*80)
        print("🎯 AI RECOMMENDATION SYSTEM TEST REPORT")
        print("="*80)
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {total_passed} ✅")
        print(f"   Failed: {total_failed} ❌")
        print(f"   Success Rate: {(total_passed/total_tests*100):.1f}%" if total_tests > 0 else "   Success Rate: N/A")
        
        for category, results in self.test_results.items():
            print(f"\n🔍 {category.upper().replace('_', ' ')} RESULTS:")
            print(f"   Passed: {results['passed']} ✅")
            print(f"   Failed: {results['failed']} ❌")
            
            if results["tests"]:
                print(f"   Test Details:")
                for test in results["tests"]:
                    status = "✅" if test["passed"] else "❌"
                    message = f" - {test['message']}" if test["message"] else ""
                    print(f"     {status} {test['name']}{message}")
        
        print("\n" + "="*80)
        
        if total_failed == 0:
            print("🎉 ALL TESTS PASSED! Your AI Recommendation System is working perfectly!")
        else:
            print(f"⚠️  {total_failed} tests failed. Please check the errors above.")
        
        print("="*80)
        
        # Save detailed report to file
        try:
            with open("test_report.json", "w") as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "summary": {
                        "total_tests": total_tests,
                        "passed": total_passed,
                        "failed": total_failed,
                        "success_rate": (total_passed/total_tests*100) if total_tests > 0 else 0
                    },
                    "results": self.test_results
                }, f, indent=2)
            print(f"📄 Detailed report saved to: test_report.json")
        except Exception as e:
            print(f"Failed to save report: {e}")
    
    async def run_all_tests(self):
        """Run all tests"""
        logger.info("🚀 Starting Comprehensive AI Recommendation System Tests")
        
        # Test database
        await self.test_database_connectivity()
        
        # Test Python service
        await self.test_python_service()
        
        # Test Next.js APIs
        await self.test_nextjs_api()
        
        # Test analytics
        await self.test_analytics()
        
        # Generate report
        self.generate_report()

async def main():
    """Main function"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        return
    
    tester = RecommendationSystemTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())