-- Simple AI Recommendation Tables (Test Version)
-- Copy this entire content and paste it into Supabase SQL Editor

-- 1. Table to store vector embeddings for books
CREATE TABLE IF NOT EXISTS book_embeddings (
    book_id UUID PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
    embedding_vector FLOAT[] NOT NULL,
    model_version TEXT DEFAULT 'paraphrase-multilingual-MiniLM-L12-v2',
    text_hash TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table to track recommendation interactions
CREATE TABLE IF NOT EXISTS recommendation_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'purchase', 'like', 'dislike')),
    recommendation_type TEXT CHECK (recommendation_type IN ('similar', 'personalized', 'trending', 'search')),
    algorithm_version TEXT DEFAULT 'v1.0',
    similarity_score FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table to store user preference profiles
CREATE TABLE IF NOT EXISTS user_preference_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_data JSONB DEFAULT '{}',
    favorite_categories TEXT[] DEFAULT '{}',
    favorite_authors TEXT[] DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table for search analytics
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    clicked_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    click_position INTEGER,
    session_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_book_embeddings_book_id ON book_embeddings(book_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_user_id ON recommendation_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_book_id ON recommendation_interactions(book_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);

-- Enable Row Level Security
ALTER TABLE book_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preference_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service role access (needed for our API)
CREATE POLICY "Service role can manage book embeddings" ON book_embeddings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage recommendation interactions" ON recommendation_interactions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage user profiles" ON user_preference_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage search analytics" ON search_analytics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');