/*
  # Create Candidate Photos Storage Bucket

  1. New Storage Bucket
    - `candidate-photos` bucket for candidate profile photos
  
  2. Security Policies
    - Admins (super_admin, administrator) can upload, update, and delete photos
    - Public users can view photos
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload candidate photos
CREATE POLICY "Admins can upload candidate photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-photos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Allow admins to update candidate photos
CREATE POLICY "Admins can update candidate photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-photos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    bucket_id = 'candidate-photos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Allow admins to delete candidate photos
CREATE POLICY "Admins can delete candidate photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-photos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Allow everyone to view candidate photos (public bucket)
CREATE POLICY "Anyone can view candidate photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'candidate-photos');
