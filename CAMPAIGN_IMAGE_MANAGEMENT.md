# Campaign Image Management

## Overview
Campaigns now support image uploads with a main campaign image and an optional gallery of additional images.

## Features

### 1. Campaign Creation
When creating a new campaign, users can:
- Upload a main campaign image
- Add multiple gallery images
- Preview images before submitting
- Remove images before creating the campaign

### 2. Campaign Details - Image Management
On the campaign details page, users can:
- View existing campaign images
- Upload new images (main or gallery)
- Replace the main campaign image
- Delete images individually
- Manage images through a dedicated dialog

### 3. Campaign List View
- Main campaign images are displayed as thumbnails on campaign cards
- Images have hover effects for better visual feedback

## Technical Details

### Database Schema
- `campaigns.image_url` (text) - URL to the main campaign image
- `campaigns.gallery_images` (text[]) - Array of URLs for gallery images

### Storage
- Bucket: `campaign-images`
- File organization: `{campaign_id}/main-{timestamp}.{ext}` or `{campaign_id}/gallery-{timestamp}-{random}.{ext}`
- Max file size: 5MB per image
- Supported formats: JPEG, JPG, PNG, WebP, GIF
- Public access enabled for easy viewing

### Image Operations

#### Upload Main Image
1. Select image through file input
2. Validates file size (max 5MB)
3. If existing image exists, deletes it from storage
4. Uploads new image to storage
5. Updates campaign record with new image URL
6. UI updates automatically

#### Upload Gallery Images
1. Select multiple images through file input
2. Validates each file size
3. Uploads all valid images to storage
4. Appends new URLs to gallery_images array
5. Updates campaign record
6. UI updates automatically

#### Delete Images
1. User confirms deletion
2. Removes file from storage bucket
3. Updates campaign record (removes URL)
4. UI updates automatically

### UI Features
- Image previews with hover effects
- Delete buttons appear on hover for better UX
- Loading states during upload/delete operations
- Success/error toast notifications
- Responsive grid layout for gallery images
- Click to open full-size images in new tab

## User Experience

### Creating a Campaign
1. Fill in campaign details
2. In the "Campaign Images" section:
   - Click the main image upload area to select a file
   - Preview appears immediately
   - Click X button to remove if needed
3. Add gallery images by clicking the gallery upload area
4. Select one or multiple files
5. Each gallery image can be removed individually
6. Submit campaign to save all images

### Managing Existing Campaign Images
1. Navigate to campaign details page
2. Click "Manage Images" button in the Campaign Images card
3. In the dialog:
   - Upload/Replace main image
   - Delete main image if exists
   - Add more gallery images
4. Images can also be deleted by hovering over them and clicking the delete button
5. All changes are saved immediately

## Best Practices
- Use high-quality images for better visual appeal
- Main image should be representative of the campaign
- Keep file sizes under 5MB for optimal performance
- Use descriptive, relevant images for campaigns
- Gallery images can showcase different aspects of the campaign
