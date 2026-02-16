/*
  # Broadcast Media Storage and Notifications System

  1. Storage Setup
    - Create storage bucket for broadcast media (images and documents)
    - Set up RLS policies for secure uploads

  2. Notifications Table
    - `push_notifications` table for mobile app notifications
    - Fields: user_id, notification_type, title, body, data, read status
    - Tracks which users have been notified about new posts

  3. Triggers
    - Auto-create notifications when broadcasts are published
    - Notification trigger for new posts

  4. Security
    - Admins can upload media
    - Mobile app users can read notifications
    - Proper RLS policies for all operations
*/

-- Create storage bucket for broadcast media
INSERT INTO storage.buckets (id, name, public)
VALUES ('broadcast-media', 'broadcast-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for broadcast media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can upload broadcast media'
  ) THEN
    CREATE POLICY "Admins can upload broadcast media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'broadcast-media'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'administrator')
        AND profiles.is_active = true
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can update broadcast media'
  ) THEN
    CREATE POLICY "Admins can update broadcast media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'broadcast-media'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'administrator')
        AND profiles.is_active = true
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can delete broadcast media'
  ) THEN
    CREATE POLICY "Admins can delete broadcast media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'broadcast-media'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'administrator')
        AND profiles.is_active = true
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view broadcast media'
  ) THEN
    CREATE POLICY "Anyone can view broadcast media"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'broadcast-media');
  END IF;
END $$;

-- Create push_notifications table for mobile app
CREATE TABLE IF NOT EXISTS push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('new_post', 'new_poll', 'new_campaign', 'campaign_update', 'general')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  related_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON push_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON push_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON push_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins can view all notifications"
  ON push_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_is_read ON push_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_push_notifications_notification_type ON push_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at ON push_notifications(created_at DESC);

-- Function to create notifications for all party members when a post is published
CREATE OR REPLACE FUNCTION create_broadcast_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notifications when a broadcast is published (not draft, has published_at)
  IF NEW.published_at IS NOT NULL AND (OLD.published_at IS NULL OR OLD.published_at IS DISTINCT FROM NEW.published_at) THEN
    -- Insert notifications for all active party members
    INSERT INTO push_notifications (user_id, notification_type, title, body, related_id, data)
    SELECT 
      pm.id,
      'new_post',
      'New Post from AR',
      LEFT(NEW.message_text, 100),
      NEW.id,
      jsonb_build_object(
        'broadcast_id', NEW.id,
        'has_attachments', NEW.has_attachments,
        'created_at', NEW.created_at
      )
    FROM party_members pm
    WHERE pm.membership_status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for broadcast notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'broadcast_notification_trigger'
  ) THEN
    CREATE TRIGGER broadcast_notification_trigger
      AFTER INSERT OR UPDATE ON broadcasts
      FOR EACH ROW
      EXECUTE FUNCTION create_broadcast_notifications();
  END IF;
END $$;

-- Update broadcasts table to ensure it has all needed columns
DO $$
BEGIN
  -- Check if media_urls column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcasts' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE broadcasts ADD COLUMN media_urls text[] DEFAULT '{}';
  END IF;

  -- Check if document_urls column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcasts' AND column_name = 'document_urls'
  ) THEN
    ALTER TABLE broadcasts ADD COLUMN document_urls text[] DEFAULT '{}';
  END IF;
END $$;