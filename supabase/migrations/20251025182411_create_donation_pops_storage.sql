/*
  # Create Donation Proof of Payment Storage

  1. Storage
    - Create 'donation-pops' storage bucket for proof of payment files
    - Allow authenticated finance and super admin users to upload
    - Public read access for verification

  2. Security
    - Finance and super admin can upload POPs
    - All authenticated users can view POPs
*/

-- Create storage bucket for donation POPs
INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-pops', 'donation-pops', true)
ON CONFLICT (id) DO NOTHING;

-- Allow finance and super admin to upload POPs
CREATE POLICY "Finance and super admin can upload donation POPs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'donation-pops' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'finance')
    AND profiles.is_active = true
  )
);

-- Allow authenticated users to view POPs
CREATE POLICY "Authenticated users can view donation POPs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'donation-pops');

-- Allow finance and super admin to delete POPs
CREATE POLICY "Finance and super admin can delete donation POPs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'donation-pops' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'finance')
    AND profiles.is_active = true
  )
);
