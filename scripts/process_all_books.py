#!/usr/bin/env python3
"""
Process all books in the database with AI embeddings
"""

import json
import requests
from supabase import create_client, Client

def process_all_books():
    print("🚀 Processing all books with AI...")
    
    # Connect to Supabase
    SUPABASE_URL = "https://zuzzlrxxmrrovmlopdiy.supabase.co/"
    SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enpscnh4bXJyb3ZtbG9wZGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI2MzE1MywiZXhwIjoyMDY0ODM5MTUzfQ.U-PIVqnn28o_PqJsIRYbr4mZvuOLbnnuU3jz0yqZoAg"
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Get all books
    result = supabase.table("books").select("*").execute()
    
    print(f"📚 Found {len(result.data)} books to process")
    
    processed = 0
    failed = 0
    
    for book in result.data:
        try:
            print(f"\n🔄 Processing: {book.get('name', 'Unknown')}")
            
            # Send to AI service
            response = requests.post("http://localhost:8000/books/process", json={
                "book": {
                    "id": book["id"],
                    "name": book.get("name", ""),
                    "author": book.get("author", ""),
                    "description": book.get("description", ""),
                    "category": book.get("category", "")
                },
                "generate_embedding": True,
                "update_cache": True
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print(f"   ✅ Success: {data.get('message')}")
                    processed += 1
                else:
                    print(f"   ❌ Failed: {data}")
                    failed += 1
            else:
                print(f"   ❌ HTTP Error: {response.status_code}")
                failed += 1
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            failed += 1
    
    print(f"\n🎉 Processing complete!")
    print(f"   ✅ Processed: {processed} books")
    print(f"   ❌ Failed: {failed} books")
    
    return processed, failed

if __name__ == "__main__":
    process_all_books()