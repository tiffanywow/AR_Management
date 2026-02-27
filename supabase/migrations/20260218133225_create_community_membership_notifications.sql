/*
  # Community Membership Change Notifications

  1. New Functionality
    - Creates trigger to send notifications when users join or leave communities
    - Notifies admins and super admins of membership changes
    - Includes community name and member details in notification

  2. Trigger Details
    - Fires on INSERT and DELETE in `community_members` table
    - Creates notification for each admin/super admin
    - Distinguishes between "joined" and "left" events

  3. Security
    - Uses existing notifications table with RLS
    - Only creates notifications for active admins
*/

-- Function to create notifications when community membership changes
CREATE OR REPLACE FUNCTION notify_community_membership_change()
RETURNS TRIGGER AS $$
DECLARE
  community_name text;
  member_name text;
  member_surname text;
  admin_record RECORD;
  action_type text;
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

  -- Create notifications for all admins and super admins
  FOR admin_record IN 
    SELECT id 
    FROM profiles 
    WHERE role IN ('super_admin', 'administrator') 
    AND is_active = true
  LOOP
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      is_read,
      created_at
    ) VALUES (
      admin_record.id,
      'Community Membership Update',
      member_name || ' ' || COALESCE(member_surname, '') || ' ' || action_type || ' the community "' || community_name || '"',
      'community_update',
      'medium',
      false,
      now()
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS community_membership_change_trigger ON community_members;

-- Create trigger for community membership changes
CREATE TRIGGER community_membership_change_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_membership_change();