-- Database Backup - Working Collaborative Editing State
-- Generated: 2025-08-24
-- This is the working state after fixing collaborative editing issues

-- Drop existing tables if they exist
DROP TABLE IF EXISTS manuscript_activity CASCADE;
DROP TABLE IF EXISTS manuscript_comments CASCADE;
DROP TABLE IF EXISTS document_revisions CASCADE;
DROP TABLE IF EXISTS editor_sessions CASCADE;
DROP TABLE IF EXISTS manuscripts CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS stripe_products CASCADE;
DROP TABLE IF EXISTS n8n_marketing_analytics CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create manuscripts table with all required columns for OnlyOffice
CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  cover_image_url TEXT NOT NULL,
  tags TEXT[],
  category TEXT NOT NULL,
  suggested_price INTEGER,
  wants_physical BOOLEAN,
  status TEXT NOT NULL,
  editor_feedback TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  editor_id UUID REFERENCES profiles(id),
  publisher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submission_count INTEGER DEFAULT 0,
  feedback_history JSONB,
  last_resubmitted_at TIMESTAMPTZ,
  -- OnlyOffice related columns
  document_content TEXT,
  document_version INTEGER,
  last_edited_at TIMESTAMPTZ,
  last_edited_by UUID REFERENCES profiles(id),
  word_count INTEGER,
  onlyoffice_key TEXT,
  storage_path TEXT,
  is_being_edited BOOLEAN DEFAULT FALSE,
  current_editors TEXT[],
  document_key TEXT,
  pdf_url TEXT,
  thumbnail_url TEXT,
  editing_status TEXT
);

-- Create manuscript_activity table
CREATE TABLE manuscript_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  users JSONB,
  activity_type TEXT NOT NULL,
  actions JSONB,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create other tables
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID REFERENCES manuscripts(id),
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  tags TEXT[],
  image_url TEXT,
  published_date TIMESTAMPTZ,
  edition TEXT,
  file_formats JSONB,
  search_text TEXT,
  embedding VECTOR,
  content_embedding VECTOR,
  embedding_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE manuscript_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID REFERENCES manuscripts(id),
  user_id UUID REFERENCES profiles(id),
  comment_text TEXT NOT NULL,
  selected_text TEXT,
  selection_start INTEGER,
  selection_end INTEGER,
  parent_comment_id UUID REFERENCES manuscript_comments(id),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID REFERENCES manuscripts(id),
  version_number INTEGER NOT NULL,
  content TEXT,
  change_description TEXT,
  changed_by UUID REFERENCES profiles(id),
  word_count INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE editor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID REFERENCES manuscripts(id),
  user_id UUID REFERENCES profiles(id),
  document_key TEXT NOT NULL,
  status TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  book_id UUID NOT NULL REFERENCES books(id),
  quantity INTEGER,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  delivery_type TEXT NOT NULL,
  shipping_address JSONB,
  status TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  purchase_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id),
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT,
  digital_price_id TEXT,
  physical_price_id TEXT,
  unit_amount INTEGER,
  currency VARCHAR(3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE n8n_marketing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id),
  campaign_type TEXT NOT NULL,
  status TEXT NOT NULL,
  content_generated JSONB,
  platforms_posted TEXT[],
  triggered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- This schema represents the working state for collaborative editing
-- All OnlyOffice-related columns are present in manuscripts table
-- manuscript_activity table supports both timestamped and non-timestamped activity logging