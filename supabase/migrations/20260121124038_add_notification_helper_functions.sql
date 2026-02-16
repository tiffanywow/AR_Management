/*
  # Add Notification Helper Functions

  1. Overview
    - Create helper functions for sending notifications
    - Support single and bulk notification creation
    - Enable easy notification management from application code

  2. New Functions
    - `create_notification()` - Create a single notification for a user
    - `create_bulk_notifications()` - Create notifications for multiple users
    - `notify_all_admins()` - Send notification to all admin users
    - `notify_by_role()` - Send notifications to users with specific roles

  3. Security
    - Functions run with SECURITY DEFINER
    - Only authenticated users with admin roles can create notifications
    - Maintains all existing RLS policies
*/

-- Function to create a single notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can create notifications';
  END IF;

  -- Insert notification
  INSERT INTO public.push_notifications (
    user_id,
    notification_type,
    title,
    body,
    data,
    related_id,
    is_read,
    sent_at
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_title,
    p_body,
    p_data,
    p_related_id,
    false,
    now()
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create bulk notifications
CREATE OR REPLACE FUNCTION public.create_bulk_notifications(
  p_user_ids UUID[],
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can create notifications';
  END IF;

  -- Insert notification for each user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.push_notifications (
      user_id,
      notification_type,
      title,
      body,
      data,
      related_id,
      is_read,
      sent_at
    ) VALUES (
      v_user_id,
      p_notification_type,
      p_title,
      p_body,
      p_data,
      p_related_id,
      false,
      now()
    );
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all admins
CREATE OR REPLACE FUNCTION public.notify_all_admins(
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_admin_ids UUID[];
BEGIN
  -- Get all active admin user IDs
  SELECT ARRAY_AGG(id) INTO v_admin_ids
  FROM profiles
  WHERE role IN ('super_admin', 'administrator')
  AND is_active = true;

  -- Create notifications
  RETURN create_bulk_notifications(
    v_admin_ids,
    p_notification_type,
    p_title,
    p_body,
    p_data,
    p_related_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify users by role
CREATE OR REPLACE FUNCTION public.notify_by_role(
  p_roles TEXT[],
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_related_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_user_ids UUID[];
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can create notifications';
  END IF;

  -- Get user IDs with specified roles
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM profiles
  WHERE role = ANY(p_roles)
  AND is_active = true;

  -- Create notifications
  RETURN create_bulk_notifications(
    v_user_ids,
    p_notification_type,
    p_title,
    p_body,
    p_data,
    p_related_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION public.create_notification IS 'Create a single notification for a specific user';
COMMENT ON FUNCTION public.create_bulk_notifications IS 'Create notifications for multiple users at once';
COMMENT ON FUNCTION public.notify_all_admins IS 'Send notification to all active administrators';
COMMENT ON FUNCTION public.notify_by_role IS 'Send notifications to all users with specified roles';