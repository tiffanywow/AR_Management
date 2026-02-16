/*
  # Fix Broadcasts Schema Mismatch

  1. Changes
    - Add missing columns from original schema if they don't exist
    - Update notification trigger to use correct column name (content instead of message_text)
    - Ensure broadcasts table has all required columns

  2. Notes
    - The broadcasts table currently uses 'content' field
    - Code expects certain fields for compatibility
    - This migration ensures everything is aligned
*/

-- Ensure broadcasts table has is_draft column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcasts' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE broadcasts ADD COLUMN is_draft boolean DEFAULT false;
  END IF;
END $$;

-- Ensure broadcasts table has target_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcasts' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE broadcasts ADD COLUMN target_type text DEFAULT 'all';
  END IF;
END $$;

-- Ensure broadcasts table has target_filter column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcasts' AND column_name = 'target_filter'
  ) THEN
    ALTER TABLE broadcasts ADD COLUMN target_filter jsonb;
  END IF;
END $$;

-- Ensure broadcasts table has has_attachments column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcasts' AND column_name = 'has_attachments'
  ) THEN
    ALTER TABLE broadcasts ADD COLUMN has_attachments boolean DEFAULT false;
  END IF;
END $$;

-- Update the notification trigger to use 'content' instead of 'message_text'
CREATE OR REPLACE FUNCTION create_broadcast_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications when a broadcast is published
  IF NEW.published_at IS NOT NULL AND NEW.status = 'published' AND (OLD IS NULL OR OLD.published_at IS NULL OR OLD.published_at IS DISTINCT FROM NEW.published_at) THEN
    -- Insert notifications for all active party members
    INSERT INTO push_notifications (user_id, notification_type, title, body, related_id, data)
    SELECT 
      pm.id,
      'new_post',
      'New Post from AR',
      LEFT(NEW.content, 100),
      NEW.id,
      jsonb_build_object(
        'broadcast_id', NEW.id,
        'has_attachments', COALESCE(NEW.has_attachments, false),
        'created_at', NEW.created_at
      )
    FROM party_members pm
    WHERE pm.membership_status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;