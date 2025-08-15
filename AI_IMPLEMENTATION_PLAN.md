# 🤖 AI Implementation Plan: Semantic Search & Recommendations

## 📋 **Project Scope**

**Features to Implement:**
- ✅ Semantic Book Search with Burmese language support
- ✅ Content Similarity Matching for Book Recommendations

**AI Model:** `intfloat/multilingual-e5-base` (97.3% accuracy from research)

---

## 🏗️ **Technical Architecture**

```
Frontend Search → API Routes → Embedding Service → Vector Database → Ranked Results
     ↓              ↓              ↓                ↓               ↓
User Query → /api/ai/search → E5 Embeddings → Supabase pgvector → Top 10 Books
Book Page → /api/ai/similar → Book Embedding → Similarity Search → Recommendations
```

---

## 🗄️ **Database Schema Changes**

### **1. Add Vector Column to Books Table**

```sql
-- Add embedding column for E5 model (768 dimensions)
ALTER TABLE books ADD COLUMN content_embedding vector(768);

-- Create vector index for fast similarity search
CREATE INDEX books_content_embedding_idx 
ON books USING ivfflat (content_embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add metadata columns for AI features
ALTER TABLE books ADD COLUMN embedding_generated_at timestamp;
ALTER TABLE books ADD COLUMN search_text text; -- preprocessed search content
```

### **2. Create Vector Search Function**

```sql
-- Stored procedure for semantic similarity search
CREATE OR REPLACE FUNCTION match_books_semantic(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  exclude_book_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  name text,
  author text,
  description text,
  image_url text,
  price numeric,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.author,
    b.description,
    b.image_url,
    b.price,
    b.category,
    1 - (b.content_embedding <=> query_embedding) AS similarity
  FROM books b
  WHERE 
    b.content_embedding IS NOT NULL
    AND (exclude_book_id IS NULL OR b.id != exclude_book_id)
    AND 1 - (b.content_embedding <=> query_embedding) > match_threshold
  ORDER BY b.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 🔧 **Backend Implementation**

### **Phase 1: AI Service Layer**

#### **File: `src/lib/ai/embedding-service.ts`**

```typescript
/**
 * E5 Embedding Service for Myanmar NLP
 */

import { createClient } from '@supabase/supabase-js';

class EmbeddingService {
  private static readonly E5_MODEL = 'intfloat/multilingual-e5-base';
  private static readonly HF_API_URL = 'https://api-inference.huggingface.co/models';
  private static readonly HF_TOKEN = process.env.HUGGING_FACE_TOKEN;

  /**
   * Preprocess Myanmar text for E5 model
   */
  static preprocessText(text: string): string {
    // Normalize Unicode for Myanmar text
    let processed = text.normalize('NFC').trim();
    
    // Remove excessive whitespace but preserve Myanmar spacing
    processed = processed.replace(/\s+/g, ' ');
    
    // Handle Myanmar punctuation normalization
    processed = processed.replace(/၊/g, ', ').replace(/။/g, '. ');
    
    return processed;
  }

  /**
   * Build search text from book data
   */
  static buildBookSearchText(book: any): string {
    const parts = [
      book.name || '',
      book.author || '',
      book.description || '',
      book.category || '',
      (book.tags || []).join(' ')
    ].filter(Boolean);
    
    return this.preprocessText(parts.join(' '));
  }

  /**
   * Generate E5 embeddings with proper query prefix
   */
  static async generateEmbedding(
    text: string, 
    isQuery: boolean = false
  ): Promise<number[]> {
    const processedText = this.preprocessText(text);
    const prefixedText = isQuery ? `query: ${processedText}` : processedText;

    try {
      const response = await fetch(`${this.HF_API_URL}/${this.E5_MODEL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prefixedText,
          options: { 
            wait_for_model: true,
            use_cache: false 
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Handle different response formats
      if (Array.isArray(result) && result.length > 0) {
        return result[0]; // Sometimes wrapped in array
      } else if (Array.isArray(result)) {
        return result;
      } else {
        throw new Error('Unexpected embedding response format');
      }
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Batch generate embeddings for multiple books
   */
  static async batchGenerateEmbeddings(books: any[]): Promise<Array<{
    id: string;
    embedding: number[];
    searchText: string;
  }>> {
    const results = [];
    
    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      const batchPromises = batch.map(async (book) => {
        const searchText = this.buildBookSearchText(book);
        const embedding = await this.generateEmbedding(searchText, false);
        return {
          id: book.id,
          embedding,
          searchText
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < books.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export default EmbeddingService;
```

#### **File: `src/lib/ai/search-service.ts`**

```typescript
/**
 * AI-Powered Search Service
 */

import EmbeddingService from './embedding-service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class AISearchService {
  /**
   * Semantic book search with Burmese support
   */
  static async semanticSearch(
    query: string, 
    options: {
      limit?: number;
      threshold?: number;
      category?: string;
    } = {}
  ): Promise<any[]> {
    const { limit = 10, threshold = 0.7, category } = options;

    try {
      // Generate query embedding with proper prefix
      const queryEmbedding = await EmbeddingService.generateEmbedding(query, true);

      // Prepare the RPC call
      let rpcCall = supabase.rpc('match_books_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      });

      // Execute search
      const { data, error } = await rpcCall;

      if (error) {
        console.error('Semantic search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      // Post-filter by category if specified
      let results = data || [];
      if (category && category !== 'all') {
        results = results.filter((book: any) => 
          book.category?.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Add search metadata
      return results.map((book: any) => ({
        ...book,
        searchMetadata: {
          similarity: book.similarity,
          searchMethod: 'semantic',
          model: 'multilingual-e5-base'
        }
      }));
      
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Find similar books for recommendations
   */
  static async findSimilarBooks(
    bookId: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<any[]> {
    const { limit = 5, threshold = 0.8 } = options;

    try {
      // Get the book's embedding
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('content_embedding, name, author')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        throw new Error('Book not found or no embedding available');
      }

      if (!book.content_embedding) {
        // If no embedding, generate it
        await this.generateBookEmbedding(bookId);
        return this.findSimilarBooks(bookId, options); // Retry
      }

      // Find similar books using the book's embedding
      const { data, error } = await supabase.rpc('match_books_semantic', {
        query_embedding: book.content_embedding,
        match_threshold: threshold,
        match_count: limit + 1, // +1 to account for excluding original
        exclude_book_id: bookId
      });

      if (error) {
        console.error('Similar books search error:', error);
        throw error;
      }

      // Limit results and add metadata
      return (data || []).slice(0, limit).map((book: any) => ({
        ...book,
        recommendationMetadata: {
          similarity: book.similarity,
          reason: 'content-similarity',
          model: 'multilingual-e5-base'
        }
      }));

    } catch (error) {
      console.error('Similar books search failed:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single book
   */
  static async generateBookEmbedding(bookId: string): Promise<void> {
    try {
      // Get book data
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        throw new Error('Book not found');
      }

      // Generate embedding
      const searchText = EmbeddingService.buildBookSearchText(book);
      const embedding = await EmbeddingService.generateEmbedding(searchText, false);

      // Update book with embedding
      const { error: updateError } = await supabase
        .from('books')
        .update({
          content_embedding: embedding,
          search_text: searchText,
          embedding_generated_at: new Date().toISOString()
        })
        .eq('id', bookId);

      if (updateError) {
        throw new Error(`Failed to update book embedding: ${updateError.message}`);
      }

    } catch (error) {
      console.error('Book embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Batch generate embeddings for all books
   */
  static async generateAllBookEmbeddings(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Get all books without embeddings
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .is('content_embedding', null);

      if (error) {
        throw new Error(`Failed to fetch books: ${error.message}`);
      }

      if (!books || books.length === 0) {
        console.log('No books need embedding generation');
        return results;
      }

      console.log(`Generating embeddings for ${books.length} books...`);

      // Generate embeddings in batches
      const batchResults = await EmbeddingService.batchGenerateEmbeddings(books);

      // Update books with embeddings
      for (const result of batchResults) {
        try {
          const { error: updateError } = await supabase
            .from('books')
            .update({
              content_embedding: result.embedding,
              search_text: result.searchText,
              embedding_generated_at: new Date().toISOString()
            })
            .eq('id', result.id);

          if (updateError) {
            throw new Error(updateError.message);
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Book ${result.id}: ${error.message}`);
        }
      }

      console.log(`Embedding generation complete: ${results.success} success, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('Batch embedding generation failed:', error);
      throw error;
    }
  }
}

export default AISearchService;
```

---

## 🌐 **API Routes Implementation**

### **File: `src/app/api/ai/search/route.ts`**

```typescript
/**
 * Semantic Search API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, category, limit = 10, threshold = 0.7 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Perform semantic search
    const results = await AISearchService.semanticSearch(query, {
      limit: Math.min(limit, 50), // Cap at 50 results
      threshold,
      category
    });

    return NextResponse.json({
      query,
      results,
      resultCount: results.length,
      searchMethod: 'semantic',
      model: 'multilingual-e5-base'
    });

  } catch (error) {
    console.error('Search API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'AI Semantic Search API',
    endpoints: {
      search: 'POST /api/ai/search',
      body: {
        query: 'string (required)',
        category: 'string (optional)',
        limit: 'number (optional, default: 10)',
        threshold: 'number (optional, default: 0.7)'
      }
    }
  });
}
```

### **File: `src/app/api/ai/similar/route.ts`**

```typescript
/**
 * Book Recommendations API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, limit = 5, threshold = 0.8 } = body;

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Find similar books
    const recommendations = await AISearchService.findSimilarBooks(bookId, {
      limit: Math.min(limit, 20), // Cap at 20 recommendations
      threshold
    });

    return NextResponse.json({
      bookId,
      recommendations,
      recommendationCount: recommendations.length,
      method: 'content-similarity',
      model: 'multilingual-e5-base'
    });

  } catch (error) {
    console.error('Recommendations API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Recommendations failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'AI Book Recommendations API',
    endpoints: {
      similar: 'POST /api/ai/similar',
      body: {
        bookId: 'string (required)',
        limit: 'number (optional, default: 5)',
        threshold: 'number (optional, default: 0.8)'
      }
    }
  });
}
```

### **File: `src/app/api/ai/generate-embeddings/route.ts`**

```typescript
/**
 * Admin API to generate embeddings for all books
 */

import { NextRequest, NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication here
    
    const results = await AISearchService.generateAllBookEmbeddings();
    
    return NextResponse.json({
      message: 'Embedding generation completed',
      results
    });

  } catch (error) {
    console.error('Embedding generation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Embedding generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

---

## 🎨 **Frontend Integration**

### **Enhanced Search Component: `src/components/SemanticSearch.tsx`**

```typescript
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Book } from '@/lib/types';

interface SemanticSearchProps {
  onResults?: (results: Book[]) => void;
  placeholder?: string;
  category?: string;
}

export default function SemanticSearch({ 
  onResults, 
  placeholder = "Search books in Myanmar or English...",
  category = "all"
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMethod, setSearchMethod] = useState<'semantic' | 'traditional'>('semantic');

  // Debounced search
  const debouncedQuery = useMemo(() => {
    const timer = setTimeout(() => query, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (query.length >= 2) {
      handleSearch();
    } else {
      setResults([]);
      onResults?.([]);
    }
  }, [debouncedQuery, category]);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          category: category === 'all' ? undefined : category,
          limit: 10,
          threshold: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      setSearchMethod(data.searchMethod);
      onResults?.(data.results || []);

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      onResults?.([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="semantic-search">
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="search-input"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.3s',
          }}
        />
        
        {loading && (
          <div className="search-loading" style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}>
            🔍
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="search-results" style={{
          marginTop: '16px',
          fontSize: '14px',
          color: '#666'
        }}>
          Found {results.length} books using {searchMethod} search
          {searchMethod === 'semantic' && (
            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
              {' '}✨ AI-Powered
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

### **Book Recommendations Component: `src/components/BookRecommendations.tsx`**

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book } from '@/lib/types';

interface BookRecommendationsProps {
  currentBookId: string;
  title?: string;
  limit?: number;
}

export default function BookRecommendations({ 
  currentBookId, 
  title = "You might also like",
  limit = 5 
}: BookRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [currentBookId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: currentBookId,
          limit,
          threshold: 0.8
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);

    } catch (error) {
      console.error('Recommendations error:', error);
      setError('Unable to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="recommendations-loading" style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#666'
      }}>
        <div>🤖 Finding similar books...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendations-error" style={{
        padding: '20px',
        color: '#d32f2f',
        textAlign: 'center'
      }}>
        {error}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="book-recommendations" style={{
      marginTop: '40px',
      padding: '20px 0'
    }}>
      <h3 style={{
        fontSize: '1.5rem',
        marginBottom: '20px',
        color: '#333'
      }}>
        {title}
        <span style={{
          fontSize: '0.8rem',
          color: '#4CAF50',
          marginLeft: '8px',
          fontWeight: 'normal'
        }}>
          ✨ AI-Powered
        </span>
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '20px'
      }}>
        {recommendations.map((book) => (
          <Link key={book.id} href={`/books/${book.id}`} style={{
            textDecoration: 'none',
            color: 'inherit'
          }}>
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <img
                src={book.image_url}
                alt={book.name}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}
              />
              
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                {book.name}
              </div>
              
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                by {book.author}
              </div>
              
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#4CAF50' }}>
                {book.price} MMK
              </div>

              {/* Show similarity score if available */}
              {(book as any).recommendationMetadata?.similarity && (
                <div style={{ 
                  fontSize: '10px', 
                  color: '#888', 
                  marginTop: '4px' 
                }}>
                  {Math.round((book as any).recommendationMetadata.similarity * 100)}% match
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## 📋 **Implementation Phases**

### **Phase 1: Infrastructure Setup (Week 1)**
1. **Database Migration**
   - Add vector column to books table
   - Install pgvector extension
   - Create similarity search function

2. **Environment Setup**
   - Get HuggingFace API token (free tier)
   - Add environment variables
   - Test API connectivity

### **Phase 2: Backend Services (Week 1-2)**
1. **AI Service Layer**
   - Implement EmbeddingService
   - Implement AISearchService
   - Add error handling and retries

2. **API Routes**
   - Create search endpoint
   - Create recommendations endpoint
   - Add admin embedding generation endpoint

### **Phase 3: Data Preparation (Week 2)**
1. **Generate Embeddings**
   - Run batch embedding generation for existing books
   - Verify embedding quality
   - Test search functionality

### **Phase 4: Frontend Integration (Week 2-3)**
1. **Enhanced Search**
   - Replace existing search with semantic search
   - Add loading states and error handling
   - Test with Myanmar language queries

2. **Recommendation System**
   - Add recommendation widgets to book detail pages
   - Implement similar book suggestions
   - Add AI-powered badges

### **Phase 5: Testing & Optimization (Week 3)**
1. **Performance Testing**
   - Test search response times
   - Optimize vector indexes
   - Add caching layer

2. **User Testing**
   - Test with Myanmar language queries
   - Validate recommendation quality
   - Gather user feedback

---

## 💰 **Cost Analysis**

### **HuggingFace Inference API**
- **Free Tier**: 1,000 requests/month
- **Pro Tier**: $9/month for 10,000 requests
- **Estimated Usage**: ~500 requests/month (development)

### **Supabase Storage**
- **Vector Storage**: ~50MB for 1000 books (768-dim embeddings)
- **Free Tier**: 500MB database (sufficient)

### **Total Monthly Cost: $0 (Free Tier)**

---

## 📊 **Performance Expectations**

Based on your research results:

- **Search Accuracy**: 97.3% (proven)
- **Response Time**: ~900ms per search
- **Recommendation Quality**: High similarity matching
- **Language Support**: Excellent Myanmar/Burmese support

---

## 🚀 **Success Metrics**

1. **Technical Metrics**
   - Search accuracy > 95%
   - Response time < 2 seconds
   - 100% uptime for AI features

2. **User Experience**
   - Improved search relevance
   - Higher user engagement with recommendations
   - Positive feedback on Myanmar language support

3. **Academic Impact**
   - Demonstrate modern AI/ML integration
   - Show practical NLP implementation
   - Prove Myanmar language AI capabilities

---

This implementation plan provides a **comprehensive, production-ready approach** to adding AI-powered semantic search and recommendations to your Myanmar book publishing platform. The phased approach ensures manageable development while the focus on your proven E5 model guarantees high-quality results! 🚀