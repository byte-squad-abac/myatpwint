-- Migration: Nuclear Database Reset with Storage Cleanup
-- Description: Complete reset including storage cleanup
-- Date: 2025-08-21
-- WARNING: THIS WILL DELETE ALL DATA AND FILES

-- ==========================================
-- STEP 1: STORAGE CLEANUP FIRST
-- ==========================================

-- Delete all storage objects first (this removes the foreign key references)
DELETE FROM storage.objects WHERE bucket_id IN ('manuscripts', 'covers');

-- Now we can safely delete buckets
DELETE FROM storage.buckets WHERE id IN ('manuscripts', 'covers');

-- ==========================================
-- STEP 2: DROP ALL POLICIES
-- ==========================================

-- Drop all RLS policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
    
    -- Drop storage policies
    FOR r IN (
        SELECT tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'storage'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ==========================================
-- STEP 3: DROP ALL FUNCTIONS AND TRIGGERS
-- ==========================================

-- Drop all functions in public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc 
        WHERE pronamespace = 'public'::regnamespace
        AND proname NOT LIKE 'pg_%'
        AND proname NOT LIKE 'information_schema_%'
    ) LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I(%s) CASCADE', r.proname, r.argtypes);
    END LOOP;
END $$;

-- ==========================================
-- STEP 4: DROP ALL TABLES
-- ==========================================

-- Drop all tables in dependency order
DROP TABLE IF EXISTS stripe_products CASCADE;
DROP TABLE IF EXISTS n8n_marketing_analytics CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS manuscripts CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop any remaining tables we might have missed
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'information_schema_%'
        AND tablename != 'schema_migrations'
    ) LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.tablename);
    END LOOP;
END $$;

-- ==========================================
-- STEP 5: CREATE CLEAN SCHEMA
-- ==========================================

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'author', 'editor', 'publisher', 'admin')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create manuscripts table
CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  cover_image_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  suggested_price INTEGER,
  wants_physical BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'published')),
  editor_feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  publisher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create books table
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  edition TEXT DEFAULT 'First Edition',
  published_date TIMESTAMPTZ DEFAULT NOW(),
  file_formats JSONB DEFAULT '{"pdf": null, "epub": null}',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('digital', 'physical')),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id, delivery_type)
);

-- Create n8n_marketing_analytics table
CREATE TABLE n8n_marketing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('triggered', 'success', 'failed', 'partial')),
  content_generated JSONB,
  platforms_posted TEXT[] DEFAULT '{}',
  error_message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create stripe_products table
CREATE TABLE stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  stripe_product_id TEXT NOT NULL UNIQUE,
  digital_price_id TEXT,
  physical_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- STEP 6: CREATE INDEXES
-- ==========================================

-- Performance indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_manuscripts_author_id ON manuscripts(author_id);
CREATE INDEX idx_manuscripts_editor_id ON manuscripts(editor_id);
CREATE INDEX idx_manuscripts_publisher_id ON manuscripts(publisher_id);
CREATE INDEX idx_manuscripts_status ON manuscripts(status);
CREATE INDEX idx_manuscripts_category ON manuscripts(category);
CREATE INDEX idx_manuscripts_submitted_at ON manuscripts(submitted_at);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_published_date ON books(published_date);
CREATE INDEX idx_books_manuscript_id ON books(manuscript_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_book_id ON purchases(book_id);
CREATE INDEX idx_n8n_analytics_book_id ON n8n_marketing_analytics(book_id);
CREATE INDEX idx_stripe_products_book_id ON stripe_products(book_id);

-- Vector search index for books (if vector extension exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE INDEX ON books USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    END IF;
END $$;

-- ==========================================
-- STEP 7: CREATE STORAGE BUCKETS
-- ==========================================

-- Manuscripts bucket for DOCX files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manuscripts',
  'manuscripts', 
  true,
  52428800, -- 50MB
  ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Covers bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- ==========================================
-- STEP 8: CREATE FUNCTIONS AND TRIGGERS
-- ==========================================

-- Updated timestamp function
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_time();

CREATE TRIGGER trigger_manuscripts_updated_at
  BEFORE UPDATE ON manuscripts
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_time();

CREATE TRIGGER trigger_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_time();

CREATE TRIGGER trigger_stripe_products_updated_at
  BEFORE UPDATE ON stripe_products
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_time();

-- Utility functions
CREATE OR REPLACE FUNCTION get_manuscript_review_duration(manuscript_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  submitted_time TIMESTAMPTZ;
BEGIN
  SELECT submitted_at INTO submitted_time FROM manuscripts WHERE id = manuscript_id;
  RETURN NOW() - submitted_time;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_editor_pending_count(editor_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM manuscripts WHERE editor_id = editor_user_id AND status = 'under_review');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_publisher_pending_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM manuscripts WHERE status = 'approved');
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- STEP 9: ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_marketing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Manuscripts policies
CREATE POLICY "Authors can view their own manuscripts" ON manuscripts
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can insert their own manuscripts" ON manuscripts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own submitted/rejected manuscripts" ON manuscripts
  FOR UPDATE USING (
    auth.uid() = author_id AND 
    status IN ('submitted', 'rejected')
  );

CREATE POLICY "Editors can view all manuscripts" ON manuscripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('editor', 'publisher', 'admin')
    )
  );

CREATE POLICY "Editors can update manuscript status" ON manuscripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('editor', 'publisher', 'admin')
    )
  );

-- Books policies
CREATE POLICY "Anyone can view published books" ON books
  FOR SELECT USING (true);

CREATE POLICY "Publishers can manage books" ON books
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('publisher', 'admin')
    )
  );

CREATE POLICY "Service role can manage all books" ON books
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Purchases policies
CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Publishers can view all purchases" ON purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('publisher', 'admin')
    )
  );

-- N8N analytics policies (publishers only)
CREATE POLICY "Publishers can view marketing analytics" ON n8n_marketing_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('publisher', 'admin')
    )
  );

CREATE POLICY "Service role can manage marketing analytics" ON n8n_marketing_analytics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Stripe products policies
CREATE POLICY "Publishers can manage stripe products" ON stripe_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('publisher', 'admin')
    )
  );

-- Storage policies
CREATE POLICY "Authors can upload manuscripts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'manuscripts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authors can view their manuscripts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'manuscripts' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('editor', 'publisher', 'admin')
      )
    )
  );

CREATE POLICY "Authors can delete their manuscripts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'manuscripts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authors can upload covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "Authors can delete their covers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'covers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==========================================
-- STEP 10: GRANT PERMISSIONS
-- ==========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Storage permissions
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- ==========================================
-- FINAL COMMENTS AND VERIFICATION
-- ==========================================

COMMENT ON TABLE profiles IS 'Clean user profiles - 5 roles: user/author/editor/publisher/admin';
COMMENT ON TABLE manuscripts IS 'Simple manuscript workflow - DOCX only with 5 statuses';
COMMENT ON TABLE books IS 'Published books with vector search and N8N integration';
COMMENT ON TABLE purchases IS 'User book purchases - digital and physical delivery';
COMMENT ON TABLE n8n_marketing_analytics IS 'N8N marketing automation tracking and analytics';
COMMENT ON TABLE stripe_products IS 'Stripe product and price mappings for payments';

-- Verify tables exist
DO $$
BEGIN
    RAISE NOTICE '=== RESET COMPLETE ===';
    RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
    RAISE NOTICE 'Storage buckets: %', (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('manuscripts', 'covers'));
    RAISE NOTICE 'Functions created: %', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public');
    RAISE NOTICE '=== SYSTEM READY ===';
END $$;