-- Migration: Add Notifications System
-- Description: Create notifications table for user alerts and system messages
-- Date: 2025-08-21

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'author_approved', 
    'author_rejected',
    'manuscript_approved',
    'manuscript_returned', 
    'book_published',
    'general'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB, -- Additional structured data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiration date
);

-- Add foreign key constraint to profiles table
ALTER TABLE notifications 
ADD CONSTRAINT fk_notifications_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_read 
ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

-- Add RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to insert notifications
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Add function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_data JSONB DEFAULT NULL,
  expires_in_days INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  expiry_date TIMESTAMPTZ;
BEGIN
  -- Calculate expiry date if provided
  IF expires_in_days IS NOT NULL THEN
    expiry_date := NOW() + INTERVAL '1 day' * expires_in_days;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, data, expires_at)
  VALUES (target_user_id, notification_type, notification_title, notification_message, notification_data, expiry_date)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_notification TO anon, authenticated, service_role;

-- Add function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET read = TRUE, updated_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;

-- Add function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notifications_count(target_user_id UUID DEFAULT auth.uid())
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result INT;
BEGIN
  SELECT COUNT(*)::INT INTO count_result
  FROM notifications 
  WHERE user_id = target_user_id 
    AND read = FALSE 
    AND (expires_at IS NULL OR expires_at > NOW());
    
  RETURN COALESCE(count_result, 0);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_unread_notifications_count TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'System notifications for users (approvals, status changes, etc.)';
COMMENT ON COLUMN notifications.user_id IS 'User who should receive this notification';
COMMENT ON COLUMN notifications.type IS 'Type of notification for categorization and handling';
COMMENT ON COLUMN notifications.title IS 'Short title for the notification';
COMMENT ON COLUMN notifications.message IS 'Full notification message';
COMMENT ON COLUMN notifications.read IS 'Whether the user has read this notification';
COMMENT ON COLUMN notifications.data IS 'Additional structured data related to the notification';
COMMENT ON COLUMN notifications.expires_at IS 'When this notification should no longer be shown';