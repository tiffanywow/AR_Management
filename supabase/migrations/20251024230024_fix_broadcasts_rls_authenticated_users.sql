/*
  # Fix Broadcasts RLS for Authenticated Users

  1. Changes
    - Add SELECT policy for authenticated users to view published broadcasts
    - This ensures all logged-in users (not just admins) can see the feed

  2. Security
    - Maintains restriction that only published broadcasts are visible
    - Only affects SELECT operations
    - Does not affect create/update/delete permissions
*/

-- Add policy for authenticated users to view published broadcasts
CREATE POLICY "Authenticated users can view published broadcasts"
  ON broadcasts
  FOR SELECT
  TO authenticated
  USING (status = 'published');
