-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS content_embedding vector(768);

-- Add metadata columns for AI features
ALTER TABLE books ADD COLUMN IF NOT EXISTS embedding_generated_at timestamp;
ALTER TABLE books ADD COLUMN IF NOT EXISTS search_text text;

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS books_content_embedding_idx 
ON books USING ivfflat (content_embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create function for semantic similarity search
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

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION match_books_semantic TO anon, authenticated, service_role;