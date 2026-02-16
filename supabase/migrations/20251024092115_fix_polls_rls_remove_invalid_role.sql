/*
  # Fix Polls RLS Policy - Remove Invalid Role

  1. Changes
    - Update the "Admins can manage polls" policy to remove 'communications_officer' role
    - Keep only valid roles: super_admin, administrator

  2. Security
    - Maintains proper access control for poll management
    - Ensures users with valid admin roles can create, edit, and delete polls
*/

DROP POLICY IF EXISTS "Admins can manage polls" ON polls;

CREATE POLICY "Admins can manage polls"
  ON polls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );