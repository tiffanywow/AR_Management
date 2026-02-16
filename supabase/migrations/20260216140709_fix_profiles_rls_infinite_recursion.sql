/*
  # Fix Profiles RLS Infinite Recursion

  1. Problem
    - Policies checking profiles table from within profiles queries cause infinite recursion
    - "Admins can view all profiles" and "Admins can update all profiles" policies query profiles while inside profiles query

  2. Solution
    - Drop the recursive policies
    - Keep simple, non-recursive policies for authenticated users
    - Add a helper function with SECURITY DEFINER to safely check user roles

  3. Security
    - Maintains proper access control
    - Users can read/update their own profiles
    - All authenticated users can view all profiles (needed for admin dashboards, member lists, etc.)
    - Admins can update any profile
*/

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create a secure function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  AND deleted_at IS NULL
  LIMIT 1;
  
  RETURN user_role IN ('super_admin', 'administrator', 'communications_officer', 'finance');
END;
$$;

-- Simple policy: authenticated users can view all active profiles
-- This is needed for admin dashboards, user management, member lists, etc.
CREATE POLICY "Authenticated users can view all active profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Users can update their own profile
-- Admins can update any profile (using the SECURITY DEFINER function)
CREATE POLICY "Users and admins can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id 
    OR public.is_admin()
  );
