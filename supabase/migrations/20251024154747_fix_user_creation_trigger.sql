/*
  # Fix User Creation Trigger

  1. Changes
    - Drop and recreate the handle_new_user function to insert into correct table (profiles)
    - Ensure it uses the correct columns: id, email, full_name, role, is_active, created_by
    
  2. Security
    - Maintains existing RLS policies
    - Function runs with SECURITY DEFINER to bypass RLS during profile creation
*/

-- Drop and recreate the function with correct table and columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active, created_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'administrator'),
    true,
    NEW.id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
