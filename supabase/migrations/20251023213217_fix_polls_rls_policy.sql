/*
  # Fix Polls RLS Policy

  1. Changes
    - Drop and recreate the "Admins can manage polls" policy with proper WITH CHECK clause
    - This allows admins to INSERT polls

  2. Notes
    - The policy was missing WITH CHECK which prevents INSERT operations
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage polls" ON polls;

-- Recreate with proper WITH CHECK
CREATE POLICY "Admins can manage polls"
  ON polls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator', 'communications_officer')
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator', 'communications_officer')
      AND profiles.is_active = true
    )
  );