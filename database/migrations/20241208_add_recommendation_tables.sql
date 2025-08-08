-- AI-Powered Recommendation System Database Schema
-- Migration: Add recommendation tables and indexes
-- Created: 2024-12-08

BEGIN;

-- Table to store vector embeddings for books
CREATE TABLE IF NOT EXISTS book_embeddings (
    book_id UUID PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
    embedding_vector FLOAT[] NOT NULL,
    model_version TEXT DEFAULT 'paraphrase-multilingual-MiniLM-L12-v2',
    text_hash TEXT NOT NULL, -- Hash of combined text to detect changes
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store user preference profiles
CREATE TABLE IF NOT EXISTS user_preference_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_vector FLOAT[],
    favorite_categories TEXT[] DEFAULT '{}',
    favorite_authors TEXT[] DEFAULT '{}',
    preferred_language TEXT DEFAULT 'myanmar',
    price_range_min NUMERIC DEFAULT 0,
    price_range_max NUMERIC DEFAULT 100000,
    interaction_count INT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track all recommendation interactions
CREATE TABLE IF NOT EXISTS recommendation_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'purchase', 'like', 'dislike', 'bookmark', 'share')),
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('similar', 'personalized', 'trending', 'category', 'author', 'new_release')),
    algorithm_version TEXT DEFAULT 'v1.0',
    similarity_score FLOAT,
    position_in_list INT, -- Position of book in recommendation list
    session_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to cache recommendation results for performance
CREATE TABLE IF NOT EXISTS recommendation_cache (
    cache_key TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL,
    book_ids UUID[] NOT NULL,
    scores FLOAT[] NOT NULL,
    algorithm_version TEXT DEFAULT 'v1.0',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track recommendation performance metrics
CREATE TABLE IF NOT EXISTS recommendation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    recommendation_type TEXT NOT NULL,
    algorithm_version TEXT DEFAULT 'v1.0',
    total_impressions INT DEFAULT 0,
    total_clicks INT DEFAULT 0,
    total_conversions INT DEFAULT 0,
    click_through_rate FLOAT DEFAULT 0,
    conversion_rate FLOAT DEFAULT 0,
    avg_similarity_score FLOAT DEFAULT 0,
    unique_users INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, recommendation_type, algorithm_version)
);

-- Table to store book similarity relationships (pre-computed for performance)
CREATE TABLE IF NOT EXISTS book_similarities (
    book_id_a UUID REFERENCES books(id) ON DELETE CASCADE,
    book_id_b UUID REFERENCES books(id) ON DELETE CASCADE,
    similarity_score FLOAT NOT NULL,
    algorithm_version TEXT DEFAULT 'v1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (book_id_a, book_id_b),
    CHECK (book_id_a != book_id_b AND book_id_a < book_id_b) -- Ensure no self-similarity and avoid duplicates
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_book_embeddings_model_version ON book_embeddings(model_version);
CREATE INDEX IF NOT EXISTS idx_book_embeddings_updated_at ON book_embeddings(updated_at);
CREATE INDEX IF NOT EXISTS idx_book_embeddings_text_hash ON book_embeddings(text_hash);

CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON user_preference_profiles(preferred_language);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_updated ON user_preference_profiles(last_updated);
CREATE INDEX IF NOT EXISTS idx_user_profiles_interaction_count ON user_preference_profiles(interaction_count);

CREATE INDEX IF NOT EXISTS idx_rec_interactions_user_id ON recommendation_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_book_id ON recommendation_interactions(book_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_type ON recommendation_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_rec_type ON recommendation_interactions(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_created_at ON recommendation_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_session ON recommendation_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_user_type_created ON recommendation_interactions(user_id, interaction_type, created_at);

CREATE INDEX IF NOT EXISTS idx_rec_cache_user_type ON recommendation_cache(user_id, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_rec_cache_expires ON recommendation_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_rec_metrics_date_type ON recommendation_metrics(date, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_rec_metrics_algorithm ON recommendation_metrics(algorithm_version);

CREATE INDEX IF NOT EXISTS idx_book_similarities_score ON book_similarities(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_book_similarities_book_a ON book_similarities(book_id_a);
CREATE INDEX IF NOT EXISTS idx_book_similarities_book_b ON book_similarities(book_id_b);

-- Row Level Security (RLS) Policies
ALTER TABLE book_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preference_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for book embeddings (needed for recommendations)
CREATE POLICY "Public read access for book embeddings" ON book_embeddings
    FOR SELECT USING (true);

-- Users can only access their own preference profiles
CREATE POLICY "Users can view own preference profile" ON user_preference_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preference profile" ON user_preference_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own recommendation interactions
CREATE POLICY "Users can view own recommendation interactions" ON recommendation_interactions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own recommendation interactions" ON recommendation_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can only access their own recommendation cache
CREATE POLICY "Users can view own recommendation cache" ON recommendation_cache
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for recommendation system
CREATE OR REPLACE FUNCTION update_user_preference_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user preference profile when new purchase is made
    INSERT INTO user_preference_profiles (user_id, interaction_count, last_updated)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        interaction_count = user_preference_profiles.interaction_count + 1,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update user profiles on purchases
CREATE OR REPLACE TRIGGER trigger_update_user_profile
    AFTER INSERT ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preference_profile();

-- Function to clean up expired recommendation cache
CREATE OR REPLACE FUNCTION cleanup_expired_recommendation_cache()
RETURNS VOID AS $$
BEGIN
    DELETE FROM recommendation_cache 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate book similarity score
CREATE OR REPLACE FUNCTION cosine_similarity(a FLOAT[], b FLOAT[])
RETURNS FLOAT AS $$
DECLARE
    dot_product FLOAT := 0;
    magnitude_a FLOAT := 0;
    magnitude_b FLOAT := 0;
    i INT;
BEGIN
    IF array_length(a, 1) != array_length(b, 1) OR a IS NULL OR b IS NULL THEN
        RETURN 0;
    END IF;
    
    FOR i IN 1..array_length(a, 1) LOOP
        dot_product := dot_product + (a[i] * b[i]);
        magnitude_a := magnitude_a + (a[i] * a[i]);
        magnitude_b := magnitude_b + (b[i] * b[i]);
    END LOOP;
    
    IF magnitude_a = 0 OR magnitude_b = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN dot_product / (sqrt(magnitude_a) * sqrt(magnitude_b));
END;
$$ LANGUAGE plpgsql;

-- Function to get trending books (used by recommendation engine)
CREATE OR REPLACE FUNCTION get_trending_books(
    time_period_days INT DEFAULT 30,
    min_purchases INT DEFAULT 2,
    limit_count INT DEFAULT 10
)
RETURNS TABLE (
    book_id UUID,
    purchase_count BIGINT,
    avg_price NUMERIC,
    trend_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as book_id,
        COUNT(p.id) as purchase_count,
        AVG(p.purchase_price) as avg_price,
        (COUNT(p.id)::FLOAT * 0.7 + 
         COALESCE(AVG(ri.similarity_score), 0.5) * 0.3) as trend_score
    FROM books b
    LEFT JOIN purchases p ON b.id = p.book_id 
        AND p.purchased_at > (NOW() - INTERVAL '1 day' * time_period_days)
        AND p.payment_status = 'succeeded'
    LEFT JOIN recommendation_interactions ri ON b.id = ri.book_id
        AND ri.interaction_type IN ('click', 'purchase')
        AND ri.created_at > (NOW() - INTERVAL '1 day' * time_period_days)
    GROUP BY b.id
    HAVING COUNT(p.id) >= min_purchases
    ORDER BY trend_score DESC, purchase_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Insert initial data for testing (optional)
INSERT INTO recommendation_metrics (date, recommendation_type, algorithm_version)
VALUES 
    (CURRENT_DATE, 'similar', 'v1.0'),
    (CURRENT_DATE, 'personalized', 'v1.0'),
    (CURRENT_DATE, 'trending', 'v1.0')
ON CONFLICT DO NOTHING;