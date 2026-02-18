/*
  # Add Campaign Image Support

  ## Changes
  1. New Columns in campaigns table
    - `image_url` (text) - URL to the main campaign image
    - `gallery_images` (text[]) - Array of URLs for additional gallery images
  
  2. Storage
    - Creates 'campaign-images' bucket for storing campaign photos
  
  3. Notes
    - Storage RLS policies are managed through Supabase dashboard
    - Bucket is public for easy image viewing
    - File size limit: 5MB per image
    - Allowed formats: JPEG, PNG, WebP, GIF
*/

-- Add image columns to campaigns table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'gallery_images'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN gallery_images text[] DEFAULT '{}';
  END IF;
END $$;

-- Create storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-images',
  'campaign-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
