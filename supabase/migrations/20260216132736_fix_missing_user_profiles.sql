/*
  # Fix Missing User Profiles

  1. Purpose
    - Creates profiles for any auth.users who don't have a profile record
    - Handles edge cases like null emails
    - Ensures all authenticated users can access the system

  2. Changes
    - Creates missing profile records for existing auth users
    - Assigns default role (administrator) to users without profiles
    - Handles users with null emails by using a placeholder

  3. Security
    - Maintains existing RLS policies
    - Uses SECURITY DEFINER for proper access
*/

-- Create profiles for any auth users that don't have one
INSERT INTO public.profiles (id, email, full_name, role, is_active, created_by)
SELECT 
  au.id,
  COALESCE(au.email, 'user_' || au.id || '@placeholder.com') as email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User') as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'administrator') as role,
  true as is_active,
  au.id as created_by
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Ensure the trigger is properly set up (recreate if needed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
