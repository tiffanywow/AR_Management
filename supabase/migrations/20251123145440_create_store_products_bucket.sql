/*
  # Create Store Products Storage Bucket

  1. New Storage Bucket
    - `store-products` bucket for product images
  
  2. Security Policies
    - Admins (super_admin, administrator) can upload, update, and delete product images
    - Public users can view product images
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-products', 'store-products', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload product images
CREATE POLICY "Admins can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Allow admins to update product images
CREATE POLICY "Admins can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    bucket_id = 'store-products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Allow admins to delete product images
CREATE POLICY "Admins can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Allow everyone to view product images (public bucket)
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'store-products');
