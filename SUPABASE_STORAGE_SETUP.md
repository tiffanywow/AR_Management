# Supabase Storage Setup Guide

This guide explains how to set up the required storage buckets in Supabase for the Broadcasting and Engagement System.

## Required Storage Buckets

### 1. advert-media
**Purpose**: Store images and videos for advertisements

**Configuration**:
- Public: Yes (allow public access)
- File size limit: 10MB
- Allowed MIME types:
  - Images: `image/jpeg`, `image/png`, `image/webp`
  - Videos: `video/mp4`, `video/quicktime`

**Setup Steps**:
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `advert-media`
4. Set as Public
5. Add file size limit policy (10MB)

**Storage Policies**:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Admins can upload advert media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'advert-media' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
    AND is_active = true
  )
);

-- Allow public read access
CREATE POLICY "Public can view advert media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'advert-media');
```

### 2. broadcast-attachments
**Purpose**: Store images and PDFs attached to broadcasts

**Configuration**:
- Public: Yes
- File size limit: 5MB
- Allowed MIME types:
  - Images: `image/jpeg`, `image/png`, `image/webp`
  - Documents: `application/pdf`

**Setup Steps**:
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `broadcast-attachments`
4. Set as Public
5. Add file size limit policy (5MB)

**Storage Policies**:
```sql
-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload broadcast attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'broadcast-attachments' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
    AND is_active = true
  )
);

-- Allow public read access
CREATE POLICY "Public can view broadcast attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'broadcast-attachments');
```

### 3. community-images
**Purpose**: Store community profile pictures

**Configuration**:
- Public: Yes
- File size limit: 2MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

**Setup Steps**:
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `community-images`
4. Set as Public
5. Add file size limit policy (2MB)

**Storage Policies**:
```sql
-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload community images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'administrator')
    AND is_active = true
  )
);

-- Allow public read access
CREATE POLICY "Public can view community images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'community-images');
```

## Usage in Application

### Uploading Files

```typescript
import { supabase } from '@/lib/supabase';

// Upload an advert image
async function uploadAdvertMedia(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from('advert-media')
    .upload(filePath, file);

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('advert-media')
    .getPublicUrl(filePath);

  return publicUrl;
}

// Upload broadcast attachment
async function uploadBroadcastAttachment(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from('broadcast-attachments')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('broadcast-attachments')
    .getPublicUrl(filePath);

  return publicUrl;
}
```

### Deleting Files

```typescript
async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}
```

## CORS Configuration

If you need to upload from the web application, ensure CORS is properly configured:

1. Go to Supabase Dashboard → Storage → Configuration
2. Add your frontend domain to allowed origins
3. For development, add `http://localhost:5173`

## Security Best Practices

1. **Always validate file types on the server side**
2. **Scan uploaded files for malware** (consider using third-party services)
3. **Use unique file names** to prevent conflicts and potential security issues
4. **Set appropriate file size limits** to prevent abuse
5. **Monitor storage usage** to detect unusual activity
6. **Regularly clean up** unused files to save storage costs

## File Naming Convention

Use the following naming convention for organized storage:

```
adverts/{advert_id}/{timestamp}_{original_name}
broadcasts/{broadcast_id}/{timestamp}_{original_name}
communities/{community_id}/profile.{ext}
```

This keeps files organized and makes it easier to manage and clean up.
