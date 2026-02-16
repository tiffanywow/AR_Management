/*
  # Fix Profiles RLS Circular Dependency

  1. Problem
    - The "Admins can view all profiles" policy creates a circular dependency
    - It checks if user is admin by reading from profiles, but reading requires the policy to pass first
    - This causes "no profile found" errors for users
    
  2. Solution
    - Drop the problematic circular policy
    - Keep only the simple "Users can read own profile" policy for SELECT
    - This allows any authenticated user to read their own profile by matching auth.uid() = id
    - Admins can still update/manage profiles through other policies
    
  3. Security
    - Users can only read their own profile (auth.uid() = id)
    - Admins can still update profiles via existing UPDATE policies
    - Profile creation still restricted to authenticated users creating their own profile
*/

-- Drop the circular dependency policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- The "Users can read own profile" policy is sufficient for users to access their own data
-- No changes needed to existing policies