/*
  # Create Adverts Media Storage Bucket

  1. New Storage
    - Create `adverts-media` bucket for storing advertisement images and videos
    - Set as public bucket for easy access
  
  2. Security Policies
    - Allow authenticated users to upload advert media
    - Allow public read access to all advert media
    - Allow creators to delete their own advert media
    
  3. Notes
    - File types: images (jpg, png, gif, webp) and videos (mp4, mov, webm)
    - Max file size will be handled by client-side validation
*/

-- Create the adverts-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'adverts-media',
  'adverts-media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload advert media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'adverts-media'
);

-- Policy: Allow public read access
CREATE POLICY "Public read access to advert media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'adverts-media');

-- Policy: Allow users to update their own uploads
CREATE POLICY "Users can update their own advert media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'adverts-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'adverts-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own advert media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'adverts-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);