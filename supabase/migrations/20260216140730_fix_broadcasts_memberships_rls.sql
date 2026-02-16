/*
  # Fix Broadcasts and Memberships RLS Policies

  1. Changes
    - Update broadcasts policies to use the new is_admin() function
    - Update memberships policies to use the new is_admin() function
    - Remove duplicate policies
    - Simplify and optimize policy checks

  2. Security
    - Maintains proper access control
    - All users can view published broadcasts
    - Admins can manage broadcasts
    - Users can view/update own memberships
    - Admins can manage all memberships
*/

-- Fix broadcasts policies
DROP POLICY IF EXISTS "Admins can manage broadcasts" ON broadcasts;

CREATE POLICY "Admins can manage all broadcasts"
  ON broadcasts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix memberships policies - remove duplicates and use helper function
DROP POLICY IF EXISTS "Administrators can view all memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON memberships;
DROP POLICY IF EXISTS "Administrators can update all memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update all memberships" ON memberships;
DROP POLICY IF EXISTS "Administrators can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view own membership" ON memberships;
DROP POLICY IF EXISTS "Users can read own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can update own membership" ON memberships;
DROP POLICY IF EXISTS "Users can update own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can create own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can insert own membership" ON memberships;

-- Simplified memberships policies
CREATE POLICY "Admins can view all memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() 
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can manage all memberships"
  ON memberships
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can insert own membership"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);
