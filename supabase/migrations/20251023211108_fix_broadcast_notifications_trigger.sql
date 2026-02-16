/*
  # Fix Broadcast Notifications Trigger

  1. Changes
    - Update trigger function to use 'memberships' table instead of 'party_members'
    - Use correct status column name
    - Ensure notifications are created for all approved members

  2. Notes
    - The memberships table has user_id field
    - Status field indicates approval status
*/

-- Update the notification trigger to use memberships table
CREATE OR REPLACE FUNCTION create_broadcast_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications when a broadcast is published
  IF NEW.published_at IS NOT NULL AND NEW.status = 'published' AND (OLD IS NULL OR OLD.published_at IS NULL OR OLD.published_at IS DISTINCT FROM NEW.published_at) THEN
    -- Insert notifications for all approved members
    INSERT INTO push_notifications (user_id, notification_type, title, body, related_id, data)
    SELECT 
      m.user_id,
      'new_post',
      'New Post from AR',
      LEFT(NEW.content, 100),
      NEW.id,
      jsonb_build_object(
        'broadcast_id', NEW.id,
        'has_attachments', COALESCE(NEW.has_attachments, false),
        'created_at', NEW.created_at
      )
    FROM memberships m
    WHERE m.status = 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;