-- Adjust the insert policy on the notifications table to avoid uuid casting errors
-- caused when auth.uid() contains a non-UUID value (e.g. an email string).

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Administrators can create notifications" ON notifications;

-- Recreate with a cast to text so the comparison never tries to coerce auth.uid() to uuid
CREATE POLICY "Administrators can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id::text = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );
