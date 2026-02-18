/*
  # Create Broadcast Comments Table

  1. New Tables
    - `broadcast_comments`
      - `id` (uuid, primary key)
      - `broadcast_id` (uuid, references broadcasts)
      - `user_id` (uuid, references auth.users)
      - `content` (text) - Comment text
      - `status` (text) - published, hidden, flagged
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on broadcast_comments table
    - Admins can view all comments
    - Users can view published comments
    - Admins can insert, update, and delete comments
    
  3. Performance
    - Add index on broadcast_id for fast comment retrieval
    - Add index on user_id for user comment history
*/

-- Create broadcast_comments table
CREATE TABLE IF NOT EXISTS broadcast_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE broadcast_comments ENABLE ROW LEVEL SECURITY;

-- Admins can view all comments
CREATE POLICY "Admins can view all comments"
  ON broadcast_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Admins can insert comments
CREATE POLICY "Admins can insert comments"
  ON broadcast_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Admins can update comments
CREATE POLICY "Admins can update comments"
  ON broadcast_comments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Admins can delete comments
CREATE POLICY "Admins can delete comments"
  ON broadcast_comments FOR DELETE
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
CREATE INDEX IF NOT EXISTS idx_broadcast_comments_broadcast_id ON broadcast_comments(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_comments_user_id ON broadcast_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_comments_created_at ON broadcast_comments(created_at);

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_broadcast_comments_updated_at'
  ) THEN
    CREATE TRIGGER update_broadcast_comments_updated_at
      BEFORE UPDATE ON broadcast_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
