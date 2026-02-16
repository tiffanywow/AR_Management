/*
  # Fix Profiles RLS Properly Without Circular Dependency
  
  1. Problem
    - Circular dependency when checking role from profiles table
    - Users cannot see their own profile
    - Admins cannot see all profiles
    
  2. Solution
    - Drop ALL problematic policies
    - Create simple, non-circular policies
    - Use a security definer function to safely check roles
    
  3. Security
    - All authenticated users can read their own profile
    - Super admins and administrators can read all profiles
    - No circular dependencies
*/

-- Drop all existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Super admins and administrators can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create a security definer function that can bypass RLS to check user role
CREATE OR REPLACE FUNCTION check_user_role(user_id uuid, required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = ANY(required_roles)
  );
END;
$$;

-- Policy 1: All authenticated users can read their own profile (no circular dependency)
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Super admins and administrators can read all profiles (uses security definer function)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    check_user_role(auth.uid(), ARRAY['super_admin', 'administrator'])
  );
