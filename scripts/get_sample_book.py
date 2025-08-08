#!/usr/bin/env python3
"""
Get a sample book from the database for testing
"""

import json
from supabase import create_client, Client

def get_sample_book():
    print("📚 Getting sample book for testing...")
    
    # Connect to Supabase
    SUPABASE_URL = "https://zuzzlrxxmrrovmlopdiy.supabase.co/"
    SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enpscnh4bXJyb3ZtbG9wZGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI2MzE1MywiZXhwIjoyMDY0ODM5MTUzfQ.U-PIVqnn28o_PqJsIRYbr4mZvuOLbnnuU3jz0yqZoAg"
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Get first book
    result = supabase.table("books").select("*").limit(1).execute()
    
    if result.data:
        book = result.data[0]
        print("✅ Found sample book:")
        print(f"   ID: {book['id']}")
        print(f"   Name: {book.get('name', 'N/A')}")
        print(f"   Author: {book.get('author', 'N/A')}")
        print(f"   Category: {book.get('category', 'N/A')}")
        
        # Return formatted book data
        return book
    else:
        print("❌ No books found in database")
        return None

if __name__ == "__main__":
    book = get_sample_book()
    if book:
        print("\n🎯 Sample book JSON:")
        print(json.dumps(book, indent=2))