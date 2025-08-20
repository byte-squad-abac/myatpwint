-- Migration: Add N8N Marketing Analytics Table
-- Description: Create table to track marketing campaign automation triggered by N8N workflows
-- Author: Claude Code Assistant
-- Date: 2025-08-19

-- Create marketing analytics table for N8N automation tracking
CREATE TABLE IF NOT EXISTS n8n_marketing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'automated_marketing',
  status TEXT NOT NULL CHECK (status IN ('triggered', 'success', 'failed', 'partial')),
  content_generated JSONB,
  platforms_posted TEXT[] DEFAULT ARRAY[]::TEXT[],
  error_message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to books table
ALTER TABLE n8n_marketing_analytics 
ADD CONSTRAINT fk_marketing_analytics_book_id 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_n8n_marketing_analytics_book_id 
ON n8n_marketing_analytics(book_id);

CREATE INDEX IF NOT EXISTS idx_n8n_marketing_analytics_status 
ON n8n_marketing_analytics(status);

CREATE INDEX IF NOT EXISTS idx_n8n_marketing_analytics_triggered_at 
ON n8n_marketing_analytics(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_n8n_marketing_analytics_campaign_type 
ON n8n_marketing_analytics(campaign_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_n8n_marketing_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_n8n_marketing_analytics_updated_at
  BEFORE UPDATE ON n8n_marketing_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_n8n_marketing_analytics_updated_at();

-- Add comments for documentation
COMMENT ON TABLE n8n_marketing_analytics IS 'Tracks marketing automation campaigns triggered by N8N workflows when books are published';
COMMENT ON COLUMN n8n_marketing_analytics.book_id IS 'Reference to the book that triggered the marketing campaign';
COMMENT ON COLUMN n8n_marketing_analytics.campaign_type IS 'Type of marketing campaign (automated_marketing, manual_campaign, etc.)';
COMMENT ON COLUMN n8n_marketing_analytics.status IS 'Status of the campaign execution';
COMMENT ON COLUMN n8n_marketing_analytics.content_generated IS 'JSON containing AI-generated content for different platforms';
COMMENT ON COLUMN n8n_marketing_analytics.platforms_posted IS 'Array of platforms where content was successfully posted';
COMMENT ON COLUMN n8n_marketing_analytics.error_message IS 'Error message if campaign failed';
COMMENT ON COLUMN n8n_marketing_analytics.triggered_at IS 'When the N8N workflow was triggered';
COMMENT ON COLUMN n8n_marketing_analytics.completed_at IS 'When the campaign execution completed';

-- Insert initial test data (optional)
-- This will be populated automatically when N8N workflows are triggered