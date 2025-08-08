-- Analytics Tables for AI Recommendation System
-- Run this migration to add analytics and tracking capabilities

-- 1. Search Analytics Table
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    algorithm TEXT NOT NULL CHECK (algorithm IN ('semantic_search', 'traditional_search')),
    results_count INTEGER NOT NULL DEFAULT 0,
    clicked_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    click_position INTEGER,
    session_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhanced Recommendation Interactions Table (extend existing)
-- Add new columns to existing table if they don't exist
DO $$
BEGIN
    -- Add algorithm_version column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='recommendation_interactions' AND column_name='algorithm_version'
    ) THEN
        ALTER TABLE recommendation_interactions ADD COLUMN algorithm_version TEXT DEFAULT 'v1.0';
    END IF;
    
    -- Add similarity_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='recommendation_interactions' AND column_name='similarity_score'
    ) THEN
        ALTER TABLE recommendation_interactions ADD COLUMN similarity_score FLOAT;
    END IF;
END $$;

-- 3. User Behavior Profiles (for analytics)
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_data JSONB NOT NULL DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 4. A/B Testing Framework
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL UNIQUE,
    description TEXT,
    variants JSONB NOT NULL DEFAULT '[]', -- Array of variant configurations
    traffic_split JSONB NOT NULL DEFAULT '{}', -- Percentage allocation per variant
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. A/B Test Assignments
CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variant TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(test_id, user_id)
);

-- 6. A/B Test Results
CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variant TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Recommendation Model Performance Tracking
CREATE TABLE IF NOT EXISTS model_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    test_dataset_id TEXT,
    evaluation_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 8. Real-time Recommendation Cache Performance
CREATE TABLE IF NOT EXISTS cache_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_type TEXT NOT NULL, -- 'embeddings', 'recommendations', 'user_profiles'
    operation TEXT NOT NULL CHECK (operation IN ('hit', 'miss', 'set', 'delete', 'expire')),
    response_time_ms FLOAT,
    cache_key_hash TEXT, -- Hashed version for privacy
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance

-- Search Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_analytics_algorithm ON search_analytics(algorithm);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics USING gin(to_tsvector('english', query));

-- Recommendation Interactions Indexes (additional)
CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_algorithm ON recommendation_interactions(algorithm_version);
CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_score ON recommendation_interactions(similarity_score);
CREATE INDEX IF NOT EXISTS idx_recommendation_interactions_book_type ON recommendation_interactions(book_id, recommendation_type);

-- User Behavior Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_user_id ON user_behavior_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_updated ON user_behavior_profiles(last_updated);

-- A/B Testing Indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_variant ON ab_test_results(test_id, variant);

-- Cache Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cache_performance_type ON cache_performance_logs(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_performance_timestamp ON cache_performance_logs(timestamp);

-- Row Level Security (RLS) Policies

-- Search Analytics RLS
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search analytics" ON search_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all search analytics" ON search_analytics
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User Behavior Profiles RLS
ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own behavior profile" ON user_behavior_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all behavior profiles" ON user_behavior_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- A/B Testing RLS (Admin only)
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

-- Only admins can view A/B test configurations
CREATE POLICY "Admins can manage A/B tests" ON ab_tests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view their own A/B test assignments
CREATE POLICY "Users can view their A/B assignments" ON ab_test_assignments
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage A/B test assignments and results
CREATE POLICY "Service role can manage A/B test data" ON ab_test_assignments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage A/B results" ON ab_test_results
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Model and Cache Performance (Admin/Service only)
ALTER TABLE model_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view model performance" ON model_performance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage model logs" ON model_performance_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage cache logs" ON cache_performance_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Helpful Database Functions for Analytics

-- 1. Function to get recommendation trends over time
CREATE OR REPLACE FUNCTION get_recommendation_trends(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    recommendation_type TEXT,
    total_views BIGINT,
    total_clicks BIGINT,
    total_purchases BIGINT,
    click_through_rate FLOAT,
    conversion_rate FLOAT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(ri.created_at) as date,
        ri.recommendation_type,
        COUNT(*) FILTER (WHERE ri.interaction_type = 'view') as total_views,
        COUNT(*) FILTER (WHERE ri.interaction_type = 'click') as total_clicks,
        COUNT(*) FILTER (WHERE ri.interaction_type = 'purchase') as total_purchases,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ri.interaction_type = 'view') > 0 
            THEN (COUNT(*) FILTER (WHERE ri.interaction_type = 'click')::float / COUNT(*) FILTER (WHERE ri.interaction_type = 'view')) * 100
            ELSE 0
        END as click_through_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ri.interaction_type = 'click') > 0 
            THEN (COUNT(*) FILTER (WHERE ri.interaction_type = 'purchase')::float / COUNT(*) FILTER (WHERE ri.interaction_type = 'click')) * 100
            ELSE 0
        END as conversion_rate
    FROM recommendation_interactions ri
    WHERE ri.created_at >= (CURRENT_DATE - INTERVAL '%s days', days_back)
      AND ri.recommendation_type IS NOT NULL
    GROUP BY DATE(ri.created_at), ri.recommendation_type
    ORDER BY date DESC, recommendation_type;
END;
$$;

-- 2. Function to update user behavior profiles
CREATE OR REPLACE FUNCTION update_user_behavior_profile(
    p_user_id UUID,
    p_interaction_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_behavior_profiles (user_id, profile_data, last_updated)
    VALUES (p_user_id, p_interaction_data, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        profile_data = jsonb_deep_merge(user_behavior_profiles.profile_data, p_interaction_data),
        last_updated = NOW();
END;
$$;

-- 3. Helper function for JSON deep merge
CREATE OR REPLACE FUNCTION jsonb_deep_merge(a JSONB, b JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    IF jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object' THEN
        RETURN (
            SELECT jsonb_object_agg(key, 
                CASE 
                    WHEN jsonb_typeof(a->key) = 'object' AND jsonb_typeof(b->key) = 'object' 
                    THEN jsonb_deep_merge(a->key, b->key)
                    WHEN b ? key THEN b->key
                    ELSE a->key
                END
            )
            FROM (SELECT unnest(array(SELECT jsonb_object_keys(a || b))) AS key) AS keys
        );
    ELSE
        RETURN COALESCE(b, a);
    END IF;
END;
$$;

-- 4. Function to execute raw SQL (for analytics service)
CREATE OR REPLACE FUNCTION execute_sql(query TEXT, params TEXT[] DEFAULT '{}')
RETURNS SETOF RECORD
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a simplified version - in production, you'd want more safety checks
    -- and parameter binding for security
    RETURN QUERY EXECUTE query;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_recommendation_trends(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_behavior_profile(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT, TEXT[]) TO service_role;

-- Comments for documentation
COMMENT ON TABLE search_analytics IS 'Tracks search queries, results, and user interactions with search results';
COMMENT ON TABLE user_behavior_profiles IS 'Stores aggregated user behavior data for personalization';
COMMENT ON TABLE ab_tests IS 'Configuration for A/B tests on recommendation algorithms';
COMMENT ON TABLE ab_test_assignments IS 'User assignments to A/B test variants';
COMMENT ON TABLE ab_test_results IS 'Results and metrics from A/B tests';
COMMENT ON TABLE model_performance_logs IS 'Tracks ML model performance over time';
COMMENT ON TABLE cache_performance_logs IS 'Monitors caching system performance';

COMMENT ON FUNCTION get_recommendation_trends(INTEGER) IS 'Returns recommendation performance trends over specified time period';
COMMENT ON FUNCTION update_user_behavior_profile(UUID, JSONB) IS 'Updates user behavior profile with new interaction data';
COMMENT ON FUNCTION execute_sql(TEXT, TEXT[]) IS 'Executes raw SQL queries for analytics (service role only)';

-- Create sample A/B test for recommendation algorithms
INSERT INTO ab_tests (test_name, description, variants, traffic_split, status) 
VALUES (
    'recommendation_algorithm_comparison',
    'Compare performance of different recommendation algorithms',
    '[
        {"name": "content_based", "description": "Traditional content-based filtering"},
        {"name": "collaborative", "description": "Collaborative filtering"},
        {"name": "hybrid_ai", "description": "AI-powered hybrid approach with embeddings"}
    ]'::jsonb,
    '{"content_based": 33, "collaborative": 33, "hybrid_ai": 34}'::jsonb,
    'draft'
) ON CONFLICT (test_name) DO NOTHING;