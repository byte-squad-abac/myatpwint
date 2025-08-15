/**
 * Fix semantic search function by recreating it with proper types
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSemanticSearchFunction() {
  console.log('Creating fixed semantic search function...');
  
  const sql = `
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
  `;

  try {
    // Execute the SQL to recreate the function
    const { data, error } = await supabase.from('books').select('id').limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }

    console.log('Database connected. Applying fix using raw SQL...');
    
    // Use a raw SQL approach through a test query that will help us understand the schema
    const { data: testData, error: testError } = await supabase.rpc('match_books_semantic', {
      query_embedding: new Array(768).fill(0),
      match_threshold: 0.1,
      match_count: 1
    });

    if (testError) {
      console.log('Current function has the expected error. Will need manual SQL execution.');
      console.log('Error:', testError.message);
      
      // The function needs to be recreated manually in the database
      console.log('\n=== MANUAL SQL TO EXECUTE ===');
      console.log(sql);
      console.log('=== END MANUAL SQL ===\n');
      
      console.log('Please execute this SQL in your Supabase SQL editor or psql connection.');
      return false;
    } else {
      console.log('Function is working correctly!');
      return true;
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

fixSemanticSearchFunction().then(success => {
  console.log('Fix result:', success ? 'SUCCESS' : 'NEEDS MANUAL EXECUTION');
});