/*
  # Create Missing Profiles for Logged-in Users

  1. Purpose
    - Creates profiles for authenticated users who don't have profile records
    - Uses metadata from auth.users to populate profile information
    - Ensures all logged-in users can access the dashboard

  2. Changes
    - Creates profile for tiffany@wow.co.na (super_admin)
    - Creates profile for user without email (administrator)
    
  3. Security
    - Maintains existing RLS policies
*/

-- Create profiles for users missing them
INSERT INTO public.profiles (id, email, full_name, role, is_active, created_by)
SELECT 
  au.id,
  COALESCE(au.email, 'user_' || au.id || '@placeholder.com') as email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User') as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'administrator') as role,
  true as is_active,
  au.id as created_by
FROM auth.users au
WHERE au.id IN ('eb2ba44e-380d-4353-a1a1-efde12a437d0', '867c8289-8ef5-45aa-9e17-2ed7c0c81af5')
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;
