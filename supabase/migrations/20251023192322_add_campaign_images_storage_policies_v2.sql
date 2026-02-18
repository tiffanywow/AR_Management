/*
  # Add Storage RLS Policies for Campaign Images

  ## Changes
  1. Storage Policies for campaign-images bucket
    - Public can view campaign images
    - Authenticated users can upload campaign images
    - Authenticated users can update campaign images
    - Authenticated users can delete campaign images
  
  ## Security
    - Read access is public (anyone can view)
    - Write access requires authentication
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access for Campaign Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete campaign images" ON storage.objects;

-- Policy: Public can view campaign images
CREATE POLICY "Public Access for Campaign Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

-- Policy: Authenticated users can upload campaign images
CREATE POLICY "Authenticated users can upload campaign images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-images');

-- Policy: Authenticated users can update campaign images
CREATE POLICY "Authenticated users can update campaign images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'campaign-images')
WITH CHECK (bucket_id = 'campaign-images');

-- Policy: Authenticated users can delete campaign images
CREATE POLICY "Authenticated users can delete campaign images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-images');
