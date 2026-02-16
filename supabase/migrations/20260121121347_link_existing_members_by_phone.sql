/*
  # Link Existing Members by Phone Number

  1. Overview
    - Automatically link existing membership records to new user accounts based on phone number
    - Prevent duplicate member records when a phone number matches existing data
    - Update membership.user_id when a match is found

  2. New Functions
    - `link_membership_by_phone()` - Links existing membership to user by phone number
    - Updated `handle_new_user()` - Now checks for existing memberships during signup

  3. Security
    - Functions run with SECURITY DEFINER to update memberships
    - Maintains all existing RLS policies
    - Only links memberships that don't already have a user_id (not already claimed)
    
  4. Behavior
    - During signup: If phone number provided, check for existing membership
    - If found and unclaimed (user_id IS NULL): Link to new user
    - If found and claimed: Log warning, don't overwrite
    - If not found: Normal signup flow continues
*/

-- Function to link membership by phone number
CREATE OR REPLACE FUNCTION public.link_membership_by_phone(
  p_user_id UUID,
  p_phone_number TEXT
)
RETURNS JSON AS $$
DECLARE
  v_membership_id UUID;
  v_membership_number TEXT;
  v_existing_user_id UUID;
BEGIN
  -- Normalize phone number (remove spaces, dashes, etc.)
  p_phone_number := regexp_replace(p_phone_number, '[^0-9+]', '', 'g');
  
  -- Check if membership exists with this phone number
  SELECT id, user_id, membership_number
  INTO v_membership_id, v_existing_user_id, v_membership_number
  FROM public.memberships
  WHERE phone_number = p_phone_number
  LIMIT 1;
  
  -- If no membership found, return not found
  IF v_membership_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No existing membership found with this phone number',
      'phone_number', p_phone_number
    );
  END IF;
  
  -- If membership already linked to a different user, return error
  IF v_existing_user_id IS NOT NULL AND v_existing_user_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This membership is already linked to another user account',
      'membership_number', v_membership_number
    );
  END IF;
  
  -- If membership already linked to this user, return success
  IF v_existing_user_id = p_user_id THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Membership already linked to this user',
      'membership_id', v_membership_id,
      'membership_number', v_membership_number
    );
  END IF;
  
  -- Link the membership to the user
  UPDATE public.memberships
  SET user_id = p_user_id,
      updated_at = now()
  WHERE id = v_membership_id;
  
  -- Update profile with phone number if not set
  UPDATE public.profiles
  SET phone_number = p_phone_number
  WHERE id = p_user_id AND (phone_number IS NULL OR phone_number = '');
  
  RETURN json_build_object(
    'success', true,
    'message', 'Membership successfully linked to user account',
    'membership_id', v_membership_id,
    'membership_number', v_membership_number,
    'phone_number', p_phone_number
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error linking membership: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to check for existing memberships
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_phone_number TEXT;
  v_link_result JSON;
BEGIN
  -- Create profile entry
  INSERT INTO public.profiles (id, email, full_name, role, is_active, created_by, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'administrator'),
    true,
    NEW.id,
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  -- Check if phone number was provided
  v_phone_number := NEW.raw_user_meta_data->>'phone_number';
  
  IF v_phone_number IS NOT NULL AND v_phone_number != '' THEN
    -- Try to link existing membership
    SELECT public.link_membership_by_phone(NEW.id, v_phone_number)
    INTO v_link_result;
    
    -- Log the result (in production, you might want to log this to a table)
    RAISE NOTICE 'Membership link attempt for user %: %', NEW.id, v_link_result;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function that can be called from the application to manually link membership
CREATE OR REPLACE FUNCTION public.link_my_membership_by_phone(p_phone_number TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN public.link_membership_by_phone(auth.uid(), p_phone_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.link_membership_by_phone IS 'Links an existing membership record to a user account based on phone number match';
COMMENT ON FUNCTION public.link_my_membership_by_phone IS 'Allows authenticated users to link their account to an existing membership using phone number';