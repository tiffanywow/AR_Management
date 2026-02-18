/*
  # Fix Campaign Attendance - Allow Viewing Attendee Membership Data

  1. Changes
    - Add RLS policy to allow authenticated users to view membership data of campaign attendees
    - This enables the campaign details page to show full attendee information
  
  2. Security
    - Only allows viewing membership data for users who have marked attendance on campaigns
    - Does not grant access to all memberships, only those linked to campaign attendance
*/

-- Allow authenticated users to view memberships of campaign attendees
CREATE POLICY "Authenticated users can view campaign attendee memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM campaign_attendance 
      WHERE campaign_attendance.user_id = memberships.user_id
    )
  );
