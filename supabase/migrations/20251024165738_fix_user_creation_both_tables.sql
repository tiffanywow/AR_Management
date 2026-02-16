/*
  # Fix User Creation to Insert Into Both Tables

  1. Changes
    - Update handle_new_user function to insert into BOTH users and profiles tables
    - users table: stores id, full_name, cell_number
    - profiles table: stores id, email, full_name, role, is_active
    
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS during user creation
*/

-- Drop and recreate the function to insert into both tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table (basic user info)
  INSERT INTO public.users (id, full_name, cell_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NULLIF(COALESCE(NEW.phone, NEW.raw_user_meta_data->>'cell_number', ''), '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into profiles table (auth and role info)
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
