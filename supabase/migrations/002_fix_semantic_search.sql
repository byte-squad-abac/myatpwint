-- Fix semantic search function to handle both text and UUID types
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
    b.id::text,
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
    AND (exclude_book_id IS NULL OR b.id::text != exclude_book_id)
    AND 1 - (b.content_embedding <=> query_embedding) > match_threshold
  ORDER BY b.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION match_books_semantic TO anon, authenticated, service_role;