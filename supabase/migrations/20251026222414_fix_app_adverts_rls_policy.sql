/*
  # Fix app_adverts RLS Policy for INSERT Operations

  1. Changes
    - Drop existing "Admins can manage adverts" policy
    - Create separate policies for different operations (SELECT, INSERT, UPDATE, DELETE)
    - Add proper with_check clause for INSERT operations
    - Ensure admins and communications officers can create adverts

  2. Security
    - Only authenticated users with correct roles can manage adverts
    - Separate policies for better control and debugging
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage adverts" ON app_adverts;

-- Create separate policies for each operation

-- SELECT policy
CREATE POLICY "Admins can view all adverts"
  ON app_adverts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator', 'communications_officer')
      AND profiles.is_active = true
    )
  );

-- INSERT policy
CREATE POLICY "Admins can create adverts"
  ON app_adverts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator', 'communications_officer')
      AND profiles.is_active = true
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update adverts"
  ON app_adverts
  FOR UPDATE
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

-- DELETE policy
CREATE POLICY "Admins can delete adverts"
  ON app_adverts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator', 'communications_officer')
      AND profiles.is_active = true
    )
  );
