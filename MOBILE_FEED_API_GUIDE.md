# Mobile App Feed & Notifications API Guide

This guide explains how to integrate the feed posts and notifications system with your mobile app.

## Overview

The system includes:
- **Feed Posts**: Social media-style posts with images, documents, and reactions
- **Push Notifications**: Automatic notifications when admins post new content
- **Reactions**: Users can like posts
- **Media Support**: Images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX)

## Database Tables

### 1. broadcasts
Main table for feed posts.

```typescript
interface Broadcast {
  id: string;
  message_text: string;
  published_at: string | null;  // When post was published
  scheduled_for: string | null;  // Future scheduled time
  is_draft: boolean;             // Draft vs published
  target_type: string;           // 'all', 'community', 'region', etc.
  target_filter: object;         // JSONB targeting filters
  like_count: number;
  has_attachments: boolean;
  media_urls: string[];          // Array of image URLs
  document_urls: string[];       // Array of document URLs
  created_by: string;            // Admin user ID
  created_at: string;
  updated_at: string;
}
```

### 2. broadcast_reactions
User reactions (likes) on posts.

```typescript
interface BroadcastReaction {
  id: string;
  broadcast_id: string;
  user_id: string;              // party_members.id
  reaction_type: string;        // Currently only 'like'
  created_at: string;
}
```

### 3. push_notifications
Notifications for mobile app users.

```typescript
interface PushNotification {
  id: string;
  user_id: string;              // party_members.id
  notification_type: string;    // 'new_post', 'new_poll', etc.
  title: string;
  body: string;
  data: object;                 // JSONB with extra data
  related_id: string;           // ID of related broadcast/poll/etc
  is_read: boolean;
  read_at: string | null;
  sent_at: string;
  created_at: string;
}
```

## Mobile App API Endpoints

### 1. Fetch Feed Posts

Get all published posts for the feed.

```typescript
// Fetch latest posts
const { data, error } = await supabase
  .from('broadcasts')
  .select(`
    *,
    profiles!broadcasts_created_by_fkey(full_name)
  `)
  .eq('is_draft', false)
  .not('published_at', 'is', null)
  .order('published_at', { ascending: false })
  .range(0, 19);  // Pagination: 20 posts per page
```

**Response:**
```json
[
  {
    "id": "uuid",
    "message_text": "Exciting news about our upcoming rally!",
    "published_at": "2025-10-23T10:00:00Z",
    "target_type": "all",
    "like_count": 45,
    "has_attachments": true,
    "media_urls": [
      "https://...supabase.co/storage/v1/object/public/broadcast-media/media/image1.jpg"
    ],
    "document_urls": [
      "https://...supabase.co/storage/v1/object/public/broadcast-media/documents/doc1.pdf"
    ],
    "created_at": "2025-10-23T09:50:00Z",
    "profiles": {
      "full_name": "Admin Name"
    }
  }
]
```

### 2. Like a Post

Add a like/reaction to a post.

```typescript
// Add like
const { error } = await supabase
  .from('broadcast_reactions')
  .insert({
    broadcast_id: 'post-uuid',
    user_id: 'current-user-id',  // from party_members table
    reaction_type: 'like'
  });

// The like_count will automatically update via database trigger
```

### 3. Unlike a Post

Remove a like from a post.

```typescript
// Remove like
const { error } = await supabase
  .from('broadcast_reactions')
  .delete()
  .eq('broadcast_id', 'post-uuid')
  .eq('user_id', 'current-user-id');

// The like_count will automatically decrease via database trigger
```

### 4. Check if User Liked a Post

```typescript
// Check if user already liked this post
const { data, error } = await supabase
  .from('broadcast_reactions')
  .select('id')
  .eq('broadcast_id', 'post-uuid')
  .eq('user_id', 'current-user-id')
  .maybeSingle();

const hasLiked = !!data;
```

### 5. Fetch User Notifications

Get notifications for the current user.

```typescript
// Fetch unread notifications
const { data, error } = await supabase
  .from('push_notifications')
  .select('*')
  .eq('user_id', 'current-user-id')
  .eq('is_read', false)
  .order('created_at', { ascending: false });
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "notification_type": "new_post",
    "title": "New Post from AR",
    "body": "Exciting news about our upcoming rally!",
    "data": {
      "broadcast_id": "uuid",
      "has_attachments": true,
      "created_at": "2025-10-23T09:50:00Z"
    },
    "related_id": "broadcast-uuid",
    "is_read": false,
    "read_at": null,
    "sent_at": "2025-10-23T10:00:00Z",
    "created_at": "2025-10-23T10:00:00Z"
  }
]
```

### 6. Mark Notification as Read

```typescript
// Mark notification as read
const { error } = await supabase
  .from('push_notifications')
  .update({
    is_read: true,
    read_at: new Date().toISOString()
  })
  .eq('id', 'notification-uuid')
  .eq('user_id', 'current-user-id');
```

### 7. Real-time Feed Updates

Subscribe to new posts in real-time.

```typescript
// Subscribe to new published posts
const subscription = supabase
  .channel('feed-posts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'broadcasts',
      filter: 'is_draft=eq.false'
    },
    (payload) => {
      console.log('New post:', payload.new);
      // Add new post to feed
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'broadcasts',
      filter: 'is_draft=eq.false'
    },
    (payload) => {
      console.log('Post updated:', payload.new);
      // Update post in feed
    }
  )
  .subscribe();

// Don't forget to unsubscribe when done
// subscription.unsubscribe();
```

### 8. Real-time Notifications

Subscribe to new notifications for the user.

```typescript
// Subscribe to new notifications for current user
const subscription = supabase
  .channel('user-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'push_notifications',
      filter: `user_id=eq.${currentUserId}`
    },
    (payload) => {
      console.log('New notification:', payload.new);
      // Show notification to user
      // Update notification badge count
    }
  )
  .subscribe();
```

## Automatic Notification Triggers

The system automatically creates notifications when:

1. **New Post Published**: When an admin publishes a post (sets `published_at` and `is_draft=false`), notifications are automatically sent to all active party members.

2. **Post Updated**: If an admin changes a draft to published, notifications are sent.

The trigger function handles this automatically - no manual intervention needed!

## Image and Document Handling

### Storage Bucket
All media is stored in the `broadcast-media` Supabase storage bucket:
- **Images**: `broadcast-media/media/`
- **Documents**: `broadcast-media/documents/`

### Access
All files are publicly accessible via their URLs. No authentication needed to view.

### Supported Formats
- **Images**: JPEG, JPG, PNG, WebP, GIF (max 10MB each)
- **Documents**: PDF, DOC, DOCX (max 20MB each)

## Example: Complete Feed Implementation

```typescript
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface Post {
  id: string;
  message_text: string;
  published_at: string;
  like_count: number;
  media_urls: string[];
  document_urls: string[];
  profiles: {
    full_name: string;
  };
  userHasLiked?: boolean;
}

export function useFeed(userId: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('feed-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'broadcasts',
        filter: 'is_draft=eq.false'
      }, loadPosts)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  async function loadPosts() {
    try {
      setLoading(true);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('broadcasts')
        .select(`
          *,
          profiles!broadcasts_created_by_fkey(full_name)
        `)
        .eq('is_draft', false)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Fetch user's reactions
      const postIds = postsData.map(p => p.id);
      const { data: reactions } = await supabase
        .from('broadcast_reactions')
        .select('broadcast_id')
        .eq('user_id', userId)
        .in('broadcast_id', postIds);

      const likedPostIds = new Set(reactions?.map(r => r.broadcast_id) || []);

      // Combine data
      const postsWithLikes = postsData.map(post => ({
        ...post,
        userHasLiked: likedPostIds.has(post.id)
      }));

      setPosts(postsWithLikes);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(postId: string) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.userHasLiked) {
      // Unlike
      await supabase
        .from('broadcast_reactions')
        .delete()
        .eq('broadcast_id', postId)
        .eq('user_id', userId);
    } else {
      // Like
      await supabase
        .from('broadcast_reactions')
        .insert({
          broadcast_id: postId,
          user_id: userId,
          reaction_type: 'like'
        });
    }

    // Reload posts to get updated counts
    await loadPosts();
  }

  return { posts, loading, toggleLike, refresh: loadPosts };
}
```

## Testing

### Test Data
To test the mobile app integration:

1. Log into the admin dashboard at `/feed`
2. Create a new post with images and documents
3. Publish the post
4. Check that notifications were created in the `push_notifications` table

### SQL Query to Check Notifications
```sql
SELECT
  pn.*,
  pm.full_name,
  pm.email
FROM push_notifications pn
JOIN party_members pm ON pn.user_id = pm.id
WHERE pn.notification_type = 'new_post'
ORDER BY pn.created_at DESC
LIMIT 10;
```

## Security

All tables have Row Level Security (RLS) enabled:

- **broadcasts**: Admins can create/update/delete. Anyone authenticated can read published posts.
- **broadcast_reactions**: Users can only manage their own reactions. Anyone can view all reactions.
- **push_notifications**: Users can only view and update their own notifications.
- **Storage**: Admins can upload. Anyone can view public files.

## Rate Limiting Recommendations

For mobile apps, consider implementing:
1. **Pagination**: Fetch 20 posts at a time
2. **Caching**: Cache posts locally and only fetch updates
3. **Debouncing**: Debounce like button to prevent spam
4. **Notification Batching**: Group multiple notifications if many arrive at once

## Support

For issues or questions, contact the backend development team or refer to the main project documentation.
