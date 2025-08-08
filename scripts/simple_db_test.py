#!/usr/bin/env python3
"""
Simple Database Test Script
Tests basic connection to your Supabase database
"""

import os
from supabase import create_client, Client

def test_database_connection():
    print("🔍 Testing Database Connection...")
    
    # Get credentials from environment
    SUPABASE_URL = "https://zuzzlrxxmrrovmlopdiy.supabase.co/"
    SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enpscnh4bXJyb3ZtbG9wZGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI2MzE1MywiZXhwIjoyMDY0ODM5MTUzfQ.U-PIVqnn28o_PqJsIRYbr4mZvuOLbnnuU3jz0yqZoAg"
    
    try:
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Test basic connection - check if books table exists
        print("✅ Connecting to Supabase...")
        result = supabase.table("books").select("id", count="exact").limit(1).execute()
        print(f"✅ Database connection successful!")
        print(f"📚 Found {result.count} books in your database")
        
        # Check if we have any books to work with
        if result.count > 0:
            print("🎉 Great! You have books in your database - we can test recommendations!")
        else:
            print("⚠️  No books found - we'll need to add some sample data first")
        
        return True, result.count
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False, 0

if __name__ == "__main__":
    success, book_count = test_database_connection()
    if success:
        print("\n🎯 Next step: Let's add the recommendation tables to your database!")
    else:
        print("\n❌ Please check your Supabase credentials and try again.")