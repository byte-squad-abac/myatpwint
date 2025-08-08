#!/usr/bin/env python3
"""
Test if the recommendation tables were created successfully
"""

from supabase import create_client, Client

def test_recommendation_tables():
    print("🔍 Testing Recommendation Tables...")
    
    # Connect to Supabase
    SUPABASE_URL = "https://zuzzlrxxmrrovmlopdiy.supabase.co/"
    SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enpscnh4bXJyb3ZtbG9wZGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI2MzE1MywiZXhwIjoyMDY0ODM5MTUzfQ.U-PIVqnn28o_PqJsIRYbr4mZvuOLbnnuU3jz0yqZoAg"
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Test each table
    tables_to_test = [
        "book_embeddings",
        "recommendation_interactions", 
        "user_preference_profiles",
        "search_analytics"
    ]
    
    print("✅ Testing recommendation tables...")
    
    for table_name in tables_to_test:
        try:
            result = supabase.table(table_name).select("*").limit(1).execute()
            print(f"✅ Table '{table_name}' exists and is accessible")
        except Exception as e:
            print(f"❌ Table '{table_name}' failed: {e}")
            return False
    
    print("\n🎉 All recommendation tables are working perfectly!")
    print("🎯 Ready to test the Python AI service!")
    return True

if __name__ == "__main__":
    test_recommendation_tables()