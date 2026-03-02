-- Create Community Join Requests Table
--
-- 1. New Tables
--    - community_join_requests
--      - id (uuid, primary key)
--      - community_id (uuid, foreign key to communities)
--      - user_id (uuid, foreign key to auth.users)
--      - membership_id (uuid, foreign key to memberships) - links to member profile
--      - status (text) - pending, approved, rejected
--      - message (text) - optional message from user
--      - created_at (timestamptz)
--      - reviewed_at (timestamptz)
--      - reviewed_by (uuid, foreign key to auth.users)
--      - rejection_reason (text)
--
-- 2. Security
--    - Enable RLS on community_join_requests table
--    - Add policy for authenticated users to create join requests
--    - Add policy for community leaders/admins to view and manage requests
--    - Add policy for users to view their own requests
--
-- 3. Constraints
--    - Status must be one of: pending, approved, rejected
--    - Unique constraint on (community_id, user_id) to prevent duplicate requests

CREATE TABLE IF NOT EXISTS community_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  UNIQUE(community_id, user_id)
);

-- Enable RLS
ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create join requests for themselves
CREATE POLICY "Users can create join requests"
  ON community_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own join requests
CREATE POLICY "Users can view own join requests"
  ON community_join_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Community leaders and admins can view requests for their communities
CREATE POLICY "Community leaders can view join requests"
  ON community_join_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_join_requests.community_id
      AND c.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'main_junior_admin')
    )
  );

-- Policy: Community leaders and admins can update join requests
CREATE POLICY "Community leaders can update join requests"
  ON community_join_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_join_requests.community_id
      AND c.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'main_junior_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_join_requests.community_id
      AND c.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'main_junior_admin')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_community_join_requests_community_id ON community_join_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_user_id ON community_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_status ON community_join_requests(status);