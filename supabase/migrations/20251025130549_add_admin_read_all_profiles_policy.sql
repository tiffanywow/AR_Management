/*
  # Add admin access to view all profiles
  
  1. Changes
    - Add policy for super_admin and administrator roles to read all profiles
    - This allows the User Management page to display all users
  
  2. Security
    - Only super_admin and administrator roles can view all profiles
    - Regular users can still only view their own profile
*/

-- Add policy for admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );
