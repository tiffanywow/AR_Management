/*
  # Update Community Membership Notifications

  1. Changes
    - Updates trigger to insert notifications into both `notifications` and `push_notifications` tables
    - Ensures both management dashboard and mobile app receive notifications
    - Properly handles community_update notification type

  2. Notes
    - Notifications table uses text user_id
    - Push_notifications table uses uuid user_id
    - Both tables will be populated for maximum compatibility
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS community_membership_change_trigger ON community_members;

-- Drop existing function
DROP FUNCTION IF EXISTS notify_community_membership_change();

-- Recreate function with both table inserts
CREATE OR REPLACE FUNCTION notify_community_membership_change()
RETURNS TRIGGER AS $$
DECLARE
  community_name text;
  member_name text;
  member_surname text;
  admin_record RECORD;
  action_type text;
  notification_message text;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'joined';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'left';
  ELSE
    RETURN NULL;
  END IF;

  -- Get community name
  SELECT name INTO community_name
  FROM communities
  WHERE id = COALESCE(NEW.community_id, OLD.community_id);

  -- Get member details
  SELECT full_name, surname INTO member_name, member_surname
  FROM memberships
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  LIMIT 1;

  -- Build notification message
  notification_message := member_name || ' ' || COALESCE(member_surname, '') || ' ' || action_type || ' the community "' || community_name || '"';

  -- Create notifications for all admins and super admins
  FOR admin_record IN 
    SELECT id 
    FROM profiles 
    WHERE role IN ('super_admin', 'administrator') 
    AND is_active = true
  LOOP
    -- Insert into notifications table (for dashboard)
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      is_read,
      created_at
    ) VALUES (
      admin_record.id::text,
      'Community Membership Update',
      notification_message,
      'community_update',
      'medium',
      false,
      now()
    );

    -- Insert into push_notifications table (for mobile app)
    INSERT INTO push_notifications (
      user_id,
      notification_type,
      title,
      body,
      data,
      related_id,
      is_read,
      created_at
    ) VALUES (
      admin_record.id,
      'community_update',
      'Community Membership Update',
      notification_message,
      jsonb_build_object(
        'community_id', COALESCE(NEW.community_id, OLD.community_id),
        'community_name', community_name,
        'action', action_type,
        'member_name', member_name || ' ' || COALESCE(member_surname, '')
      ),
      COALESCE(NEW.community_id, OLD.community_id)::text,
      false,
      now()
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER community_membership_change_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_membership_change();