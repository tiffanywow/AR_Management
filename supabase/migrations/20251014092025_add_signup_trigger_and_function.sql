/*
  # Add Automatic Profile Creation and Public Signup

  1. Changes
    - Create function to automatically create profile on user signup
    - Add trigger to auth.users table
    - Create public signup function
    
  2. Security
    - Maintains RLS policies
    - Only creates profile on new user signup
*/

-- Function to handle new user signup
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create a function to create the first super admin
CREATE OR REPLACE FUNCTION public.create_initial_super_admin(
  admin_email TEXT,
  admin_password TEXT,
  admin_name TEXT
)
RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- This function should only be used for initial setup
  -- Insert into auth.users would require service role, so we'll return instructions
  RETURN json_build_object(
    'message', 'Please create user in Supabase Dashboard',
    'email', admin_email,
    'password', admin_password,
    'full_name', admin_name,
    'role', 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
