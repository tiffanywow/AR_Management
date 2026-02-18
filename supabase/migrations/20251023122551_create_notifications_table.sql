/*
  # Create Notifications Table for Push Notifications

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (text) - Email or user identifier for app users
      - `title` (text) - Notification title
      - `message` (text) - Notification body text
      - `type` (text) - Type of notification (membership_approved, membership_rejected, broadcast, etc.)
      - `data` (jsonb) - Additional data payload for the app
      - `is_read` (boolean) - Whether notification has been read
      - `created_at` (timestamp)
      - `read_at` (timestamp)

  2. Security
    - Enable RLS on `notifications` table
    - Users can read their own notifications (by user_id matching email)
    - Administrators can create notifications for any user
    - Administrators can view all notifications

  3. Indexes
    - Index on user_id for fast lookups
    - Index on created_at for sorting
    - Index on is_read for filtering unread notifications
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications (matching by email/user_id)
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Administrators can create notifications for any user
CREATE POLICY "Administrators can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Administrators can view all notifications
CREATE POLICY "Administrators can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Administrators can delete notifications
CREATE POLICY "Administrators can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );
