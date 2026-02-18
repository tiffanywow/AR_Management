/*
  # Add Administrator Access to Memberships

  1. Changes
    - Add RLS policy to allow super_admin and administrator roles to view all memberships
    - Add RLS policy to allow super_admin and administrator roles to update membership status
    - Add RLS policy to allow super_admin and administrator roles to delete memberships

  2. Security
    - Only authenticated users with super_admin or administrator role can access
    - Checks that the profile is active
*/

-- Allow administrators to view all memberships
CREATE POLICY "Administrators can view all memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Allow administrators to update any membership (e.g., approve/reject)
CREATE POLICY "Administrators can update all memberships"
  ON memberships FOR UPDATE
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

-- Allow administrators to delete memberships
CREATE POLICY "Administrators can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );
