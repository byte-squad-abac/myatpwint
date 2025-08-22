-- Migration: Fix Foreign Key Relationships
-- Description: Add proper foreign key constraints and cascading rules
-- Date: 2025-08-21

-- Add missing columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejected_by UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add missing columns to manuscripts table if they don't exist  
ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Drop existing foreign key constraints if they exist (to recreate them properly)
ALTER TABLE books DROP CONSTRAINT IF EXISTS fk_books_manuscript_id;
ALTER TABLE manuscripts DROP CONSTRAINT IF EXISTS fk_manuscripts_author_id;
ALTER TABLE manuscripts DROP CONSTRAINT IF EXISTS fk_manuscripts_editor_id;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_user_id;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_approved_by;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_rejected_by;

-- Fix books table foreign keys
ALTER TABLE books 
ADD CONSTRAINT fk_books_manuscript_id 
FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE SET NULL;

-- Fix manuscripts table foreign keys
ALTER TABLE manuscripts 
ADD CONSTRAINT fk_manuscripts_author_id 
FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE manuscripts 
ADD CONSTRAINT fk_manuscripts_editor_id 
FOREIGN KEY (editor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix profiles table foreign keys
ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_user_id 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_approved_by 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_rejected_by 
FOREIGN KEY (rejected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for better performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_books_manuscript_id ON books(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_author_id ON manuscripts(author_id);  
CREATE INDEX IF NOT EXISTS idx_manuscripts_editor_id ON manuscripts(editor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_by ON profiles(approved_by);
CREATE INDEX IF NOT EXISTS idx_profiles_rejected_by ON profiles(rejected_by);

-- Add check constraints for data integrity
ALTER TABLE manuscripts ADD CONSTRAINT chk_manuscripts_valid_status 
CHECK (status IN ('submitted', 'in_review', 'returned', 'approved', 'queued_for_publication', 'published', 'rejected'));

ALTER TABLE profiles ADD CONSTRAINT chk_profiles_valid_role
CHECK (role IN ('user', 'pending_author', 'author', 'editor', 'publisher', 'admin'));

-- Add triggers to automatically update manuscript status when books are created/deleted
CREATE OR REPLACE FUNCTION handle_book_manuscript_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a book is inserted with manuscript_id, mark manuscript as published
  IF TG_OP = 'INSERT' AND NEW.manuscript_id IS NOT NULL THEN
    UPDATE manuscripts 
    SET status = 'published', published_at = NOW()
    WHERE id = NEW.manuscript_id AND status = 'queued_for_publication';
  END IF;

  -- When a book is deleted, revert manuscript status if it was published
  IF TG_OP = 'DELETE' AND OLD.manuscript_id IS NOT NULL THEN
    UPDATE manuscripts 
    SET status = 'queued_for_publication', published_at = NULL
    WHERE id = OLD.manuscript_id AND status = 'published';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_book_manuscript_status ON books;
CREATE TRIGGER trigger_book_manuscript_status
  AFTER INSERT OR DELETE ON books
  FOR EACH ROW
  EXECUTE FUNCTION handle_book_manuscript_status();

-- Add trigger to automatically set timestamps
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create update triggers
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_time();

DROP TRIGGER IF EXISTS trigger_manuscripts_updated_at ON manuscripts;
CREATE TRIGGER trigger_manuscripts_updated_at
  BEFORE UPDATE ON manuscripts
  FOR EACH ROW  
  EXECUTE FUNCTION update_modified_time();

-- Add comments for documentation
COMMENT ON CONSTRAINT fk_books_manuscript_id ON books IS 'Links book to its source manuscript (SET NULL on manuscript deletion)';
COMMENT ON CONSTRAINT fk_manuscripts_author_id ON manuscripts IS 'Links manuscript to its author (CASCADE on user deletion)';
COMMENT ON CONSTRAINT fk_manuscripts_editor_id ON manuscripts IS 'Links manuscript to its editor (SET NULL on editor deletion)';
COMMENT ON CONSTRAINT fk_profiles_user_id ON profiles IS 'Links profile to auth user (CASCADE on user deletion)';
COMMENT ON CONSTRAINT fk_profiles_approved_by ON profiles IS 'Tracks who approved this author application';
COMMENT ON CONSTRAINT fk_profiles_rejected_by ON profiles IS 'Tracks who rejected this author application';

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY; 
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies if they don't exist
DO $$
BEGIN
  -- Profiles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
    CREATE POLICY "Users can view their own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON profiles  
      FOR UPDATE USING (auth.uid() = id);
  END IF;

  -- Manuscripts policies  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manuscripts' AND policyname = 'Authors can manage their manuscripts') THEN
    CREATE POLICY "Authors can manage their manuscripts" ON manuscripts
      FOR ALL USING (auth.uid() = author_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manuscripts' AND policyname = 'Editors can view all manuscripts') THEN
    CREATE POLICY "Editors can view all manuscripts" ON manuscripts
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('editor', 'publisher', 'admin')
        )
      );
  END IF;

  -- Books policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'books' AND policyname = 'Anyone can view published books') THEN
    CREATE POLICY "Anyone can view published books" ON books
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'books' AND policyname = 'Publishers can manage books') THEN
    CREATE POLICY "Publishers can manage books" ON books
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('publisher', 'admin')
        )
      );
  END IF;
END $$;