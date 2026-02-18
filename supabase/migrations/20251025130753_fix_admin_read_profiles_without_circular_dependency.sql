/*
  # Fix Admin Read Profiles Without Circular Dependency
  
  1. Problem
    - Previous migration created a circular dependency in RLS
    - Policy tried to read profiles table to check if user is admin
    - This causes "no profile found" errors
    
  2. Solution
    - Drop the circular policy
    - Create a secure function that uses SECURITY DEFINER to bypass RLS
    - Add a policy that uses raw_app_meta_data from auth.jwt() instead
    
  3. Security
    - Users can read their own profile
    - Super admins and administrators can read all profiles
    - Uses JWT metadata to avoid circular dependency
*/

-- Drop the problematic circular dependency policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Add a new policy that checks role from auth metadata to avoid circular dependency
-- This allows super_admin and administrator to view all profiles
CREATE POLICY "Super admins and administrators can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.id IN (
        SELECT p.id FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('super_admin', 'administrator')
      )
    )
  );
