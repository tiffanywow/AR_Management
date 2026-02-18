# Mobile App API Integration Guide

This guide provides comprehensive documentation for integrating the mobile app with the Broadcasting and Engagement System backend.

## Table of Contents

1. [Authentication](#authentication)
2. [Broadcasts API](#broadcasts-api)
3. [Adverts API](#adverts-api)
4. [Polls API](#polls-api)
5. [Communities API](#communities-api)
6. [Real-time Updates](#real-time-updates)
7. [Best Practices](#best-practices)

## Authentication

All API calls use Supabase authentication. Users should authenticate with their credentials first.

### Environment Variables

```javascript
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Initialize Supabase Client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

---

## Broadcasts API

### Get Broadcast Feed

Retrieve the latest broadcasts for the app feed.

**Endpoint**: Query `broadcasts` table

```javascript
async function getBroadcastFeed(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select(`
      *,
      broadcast_attachments(*),
      profiles:created_by(full_name)
    `)
    .eq('is_draft', false)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}
```

**Response Format**:
```json
[
  {
    "id": "uuid",
    "message_text": "Join us for the Youth Rally this Saturday!",
    "published_at": "2025-10-20T10:00:00Z",
    "like_count": 145,
    "target_type": "all",
    "broadcast_attachments": [
      {
        "id": "uuid",
        "attachment_type": "campaign_link",
        "campaign_id": "uuid",
        "file_url": null
      }
    ],
    "profiles": {
      "full_name": "Administrator"
    }
  }
]
```

### Get Single Broadcast

```javascript
async function getBroadcast(broadcastId) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select(`
      *,
      broadcast_attachments(*),
      profiles:created_by(full_name)
    `)
    .eq('id', broadcastId)
    .single();

  if (error) throw error;
  return data;
}
```

### Like/Unlike a Broadcast

```javascript
async function toggleBroadcastLike(broadcastId, userId) {
  // Check if already liked
  const { data: existing } = await supabase
    .from('broadcast_reactions')
    .select('id')
    .eq('broadcast_id', broadcastId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('broadcast_reactions')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase
      .from('broadcast_reactions')
      .insert([{
        broadcast_id: broadcastId,
        user_id: userId,
        reaction_type: 'like'
      }]);

    if (error) throw error;
    return { liked: true };
  }
}
```

### Check if User Liked Broadcast

```javascript
async function hasUserLikedBroadcast(broadcastId, userId) {
  const { data } = await supabase
    .from('broadcast_reactions')
    .select('id')
    .eq('broadcast_id', broadcastId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}
```

---

## Adverts API

### Get Active Adverts

Retrieve adverts that should be displayed to the user based on their demographics.

```javascript
async function getActiveAdverts(userProfile) {
  const now = new Date().toISOString();

  let query = supabase
    .from('app_adverts')
    .select('*')
    .eq('status', 'active')
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gte.${now}`);

  // Filter by user demographics if targeting is set
  // Note: This is simplified - you may need server-side filtering for complex queries

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  // Client-side filtering for demographics
  return data.filter(advert => {
    // Check gender targeting
    if (advert.target_gender && advert.target_gender !== userProfile.gender) {
      return false;
    }

    // Check age targeting
    if (advert.target_age_min && advert.target_age_max) {
      const userAge = calculateAge(userProfile.date_of_birth);
      if (userAge < advert.target_age_min || userAge > advert.target_age_max) {
        return false;
      }
    }

    // Check region targeting
    if (advert.target_regions && advert.target_regions.length > 0) {
      if (!advert.target_regions.includes(userProfile.region)) {
        return false;
      }
    }

    return true;
  });
}

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
```

**Response Format**:
```json
[
  {
    "id": "uuid",
    "title": "Youth Rally This Saturday",
    "content_type": "image",
    "media_url": "https://...",
    "text_content": "Join us for our annual youth rally!",
    "display_duration_seconds": 10,
    "call_to_action_type": "phone",
    "call_to_action_value": "+264812345678",
    "content_url": "https://example.com",
    "target_gender": null,
    "target_age_min": 18,
    "target_age_max": 35
  }
]
```

### Track Advert View

```javascript
async function trackAdvertView(advertId, userId, userDemographics) {
  const { error } = await supabase
    .from('advert_analytics')
    .insert([{
      advert_id: advertId,
      user_id: userId,
      event_type: 'view',
      user_region: userDemographics.region,
      user_age: calculateAge(userDemographics.date_of_birth),
      user_gender: userDemographics.gender,
      user_membership_type: userDemographics.membership_type
    }]);

  if (error) console.error('Failed to track view:', error);
}
```

### Track Advert Click

```javascript
async function trackAdvertClick(advertId, userId, userDemographics) {
  const { error } = await supabase
    .from('advert_analytics')
    .insert([{
      advert_id: advertId,
      user_id: userId,
      event_type: 'click',
      user_region: userDemographics.region,
      user_age: calculateAge(userDemographics.date_of_birth),
      user_gender: userDemographics.gender,
      user_membership_type: userDemographics.membership_type
    }]);

  if (error) console.error('Failed to track click:', error);
}
```

---

## Polls API

### Get Active Polls

Retrieve polls that the user can vote on.

```javascript
async function getActivePolls() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('polls')
    .select(`
      *,
      poll_options(*)
    `)
    .eq('is_active', true)
    .gt('closes_at', now)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

**Response Format**:
```json
[
  {
    "id": "uuid",
    "question": "What issue should we prioritize?",
    "description": "Help us decide our focus for next quarter",
    "closes_at": "2025-10-27T23:59:59Z",
    "target_type": "all",
    "total_responses": 342,
    "poll_options": [
      {
        "id": "uuid",
        "option_text": "Education Reform",
        "option_order": 1,
        "vote_count": 145
      },
      {
        "id": "uuid",
        "option_text": "Healthcare Access",
        "option_order": 2,
        "vote_count": 197
      }
    ]
  }
]
```

### Check if User Voted

```javascript
async function hasUserVoted(pollId, userId) {
  const { data } = await supabase
    .from('poll_responses')
    .select('id, option_id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .maybeSingle();

  return data;
}
```

### Submit Poll Vote

```javascript
async function submitPollVote(pollId, optionId, userId) {
  // Check if already voted
  const existing = await hasUserVoted(pollId, userId);

  if (existing) {
    throw new Error('User has already voted in this poll');
  }

  const { error } = await supabase
    .from('poll_responses')
    .insert([{
      poll_id: pollId,
      option_id: optionId,
      user_id: userId
    }]);

  if (error) throw error;
  return { success: true };
}
```

### Get Poll Results

```javascript
async function getPollResults(pollId) {
  const { data, error } = await supabase
    .from('polls')
    .select(`
      *,
      poll_options(*)
    `)
    .eq('id', pollId)
    .single();

  if (error) throw error;

  // Calculate percentages
  const totalVotes = data.poll_options.reduce((sum, opt) => sum + opt.vote_count, 0);

  return {
    ...data,
    poll_options: data.poll_options.map(option => ({
      ...option,
      percentage: totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0
    }))
  };
}
```

---

## Communities API

### Get User Communities

Retrieve all communities a user belongs to, including leader information.

```javascript
async function getUserCommunities(userId) {
  const { data: memberships, error } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const communityIds = memberships.map(m => m.community_id);

  const { data: communities, error: commError } = await supabase
    .from('communities')
    .select(`
      *,
      leader:leader_id(id, full_name, surname, phone_number, email)
    `)
    .in('id', communityIds)
    .eq('status', 'active');

  if (commError) throw commError;
  return communities || [];
}
```

**Response Format**:
```json
[
  {
    "id": "uuid",
    "name": "Youth Wing",
    "description": "Community for young members",
    "leader_id": "uuid",
    "leader_title": "Chairman",
    "leader_contact": "+264811234567",
    "member_count": 150,
    "created_at": "2025-01-15T10:00:00Z",
    "leader": {
      "id": "uuid",
      "full_name": "Werner",
      "surname": "Alweendo",
      "phone_number": "+264811234567",
      "email": "werner@example.com"
    }
  }
]
```

**UI Display Recommendation for Community List**:

Each community card in the list should show:
- Community name and type
- Member count
- Leader name and title (if assigned)

Example card:
```
┌─────────────────────────────────┐
│ 👥 Youth Wing                   │
│ 150 members • Youth             │
│                                 │
│ 👑 Chairman: Werner Alweendo   │
└─────────────────────────────────┘
```

### Get Community Details

Retrieve detailed information about a specific community, including the leader.

**IMPORTANT FOR MOBILE APP**: Display the community leader information prominently on the community details page.

```javascript
async function getCommunityDetails(communityId) {
  const { data, error } = await supabase
    .from('communities')
    .select(`
      *,
      leader:leader_id(id, full_name, surname, phone_number, email)
    `)
    .eq('id', communityId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
```

**Response Format**:
```json
{
  "id": "uuid",
  "name": "Youth Wing",
  "description": "Community for young members",
  "community_type": "youth",
  "privacy_setting": "public",
  "leader_id": "uuid",
  "leader_title": "Chairman",
  "leader_contact": "+264811234567",
  "member_count": 150,
  "created_at": "2025-01-15T10:00:00Z",
  "status": "active",
  "leader": {
    "id": "uuid",
    "full_name": "Werner",
    "surname": "Alweendo",
    "phone_number": "+264811234567",
    "email": "werner@example.com"
  }
}
```

**UI Display Recommendation for Mobile App**:

The community details page should display the leader section as follows:

```
┌─────────────────────────────────────┐
│  Youth Wing                         │
│  150 members • Public               │
│                                     │
│  Description of community...        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👑 Community Leader         │   │
│  │                             │   │
│  │ Chairman                    │   │
│  │ Werner Alweendo             │   │
│  │ 📱 +264811234567            │   │
│  │ ✉️  werner@example.com      │   │
│  └─────────────────────────────┘   │
│                                     │
│  [View Members] [View Posts]       │
└─────────────────────────────────────┘
```

**Display Logic**:
- Show leader section ONLY if `leader_id` is not null
- Display `leader_title` (e.g., "Chairman", "President") if available, otherwise show "Community Leader"
- Show leader's full name: `${leader.full_name} ${leader.surname}`
- Display phone number if `leader.phone_number` is not null
- Display email if `leader.email` is not null
- The leader section should be visually distinct (e.g., card with light background)

### Get All Communities

Retrieve all active communities with leader information (useful for community discovery).

```javascript
async function getAllCommunities(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('communities')
    .select(`
      *,
      leader:leader_id(id, full_name, surname, phone_number, email)
    `)
    .eq('status', 'active')
    .eq('privacy_setting', 'public')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}
```

**Response Format**:
```json
[
  {
    "id": "uuid",
    "name": "Youth Wing",
    "description": "Community for young members",
    "community_type": "youth",
    "privacy_setting": "public",
    "leader_id": "uuid",
    "leader_title": "Chairman",
    "leader_contact": "+264811234567",
    "member_count": 150,
    "created_at": "2025-01-15T10:00:00Z",
    "leader": {
      "id": "uuid",
      "full_name": "Werner",
      "surname": "Alweendo",
      "phone_number": "+264811234567",
      "email": "werner@example.com"
    }
  },
  {
    "id": "uuid",
    "name": "Women's Network",
    "description": "Empowering women members",
    "community_type": "women",
    "privacy_setting": "public",
    "leader_id": "uuid",
    "leader_title": "President",
    "leader_contact": "+264812345678",
    "member_count": 200,
    "created_at": "2025-01-10T10:00:00Z",
    "leader": {
      "id": "uuid",
      "full_name": "Tiffany",
      "surname": "Nels",
      "phone_number": "+264812345678",
      "email": "tiffany@example.com"
    }
  }
]
```

### Get Community Broadcasts

Retrieve broadcasts targeted to a specific community.

```javascript
async function getCommunityBroadcasts(communityId, limit = 20) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select(`
      *,
      broadcast_attachments(*),
      profiles:created_by(full_name)
    `)
    .eq('is_draft', false)
    .not('published_at', 'is', null)
    .eq('target_type', 'community')
    .contains('target_filter', { community_id: communityId })
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
```

---

## Real-time Updates

### Subscribe to New Broadcasts

Use Supabase Realtime to get instant updates when new broadcasts are posted.

```javascript
function subscribeToBroadcasts(onNewBroadcast) {
  const subscription = supabase
    .channel('public:broadcasts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'broadcasts',
        filter: 'is_draft=eq.false'
      },
      (payload) => {
        // Fetch full broadcast with attachments
        getBroadcast(payload.new.id).then(broadcast => {
          onNewBroadcast(broadcast);
        });
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(subscription);
  };
}

// Usage
const unsubscribe = subscribeToBroadcasts((newBroadcast) => {
  console.log('New broadcast:', newBroadcast);
  // Update UI, show notification, etc.
});

// Clean up when component unmounts
// unsubscribe();
```

### Subscribe to Broadcast Likes

```javascript
function subscribeToBroadcastLikes(broadcastId, onLikeChange) {
  const subscription = supabase
    .channel(`broadcast:${broadcastId}:likes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'broadcast_reactions',
        filter: `broadcast_id=eq.${broadcastId}`
      },
      async (payload) => {
        // Fetch updated broadcast to get current like count
        const broadcast = await getBroadcast(broadcastId);
        onLikeChange(broadcast.like_count);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}
```

### Subscribe to Poll Updates

```javascript
function subscribeToPollUpdates(pollId, onPollUpdate) {
  const subscription = supabase
    .channel(`poll:${pollId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'poll_responses',
        filter: `poll_id=eq.${pollId}`
      },
      async () => {
        // Fetch updated poll results
        const results = await getPollResults(pollId);
        onPollUpdate(results);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}
```

---

## Best Practices

### 1. Pagination

Always use pagination for list endpoints to avoid loading too much data:

```javascript
async function getBroadcastsPaginated(page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('broadcasts')
    .select('*', { count: 'exact' })
    .eq('is_draft', false)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize)
  };
}
```

### 2. Caching

Implement caching to reduce database calls:

```javascript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key, fetchFunction) {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await fetchFunction();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// Usage
const broadcasts = await getCachedData('broadcasts', () => getBroadcastFeed(20, 0));
```

### 3. Error Handling

Always implement proper error handling:

```javascript
async function safeApiCall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API Error:', error);

    // Handle specific error types
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }

    if (error.message?.includes('JWT')) {
      // Auth token expired, trigger re-authentication
      // handleAuthExpired();
    }

    throw error;
  }
}
```

### 4. Offline Support

Implement offline caching for better user experience:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getBroadcastsWithOfflineSupport() {
  try {
    const broadcasts = await getBroadcastFeed();

    // Cache for offline use
    await AsyncStorage.setItem('cached_broadcasts', JSON.stringify(broadcasts));

    return broadcasts;
  } catch (error) {
    // If online fetch fails, return cached data
    const cached = await AsyncStorage.getItem('cached_broadcasts');
    if (cached) {
      return JSON.parse(cached);
    }
    throw error;
  }
}
```

### 5. Analytics Tracking

Track user engagement for analytics:

```javascript
// Track when user views a broadcast
function trackBroadcastView(broadcastId) {
  // Log analytics event
  analytics.logEvent('broadcast_viewed', {
    broadcast_id: broadcastId,
    timestamp: new Date().toISOString()
  });
}

// Track when user clicks on advert
function trackAdvertInteraction(advertId, actionType) {
  analytics.logEvent('advert_interaction', {
    advert_id: advertId,
    action_type: actionType,
    timestamp: new Date().toISOString()
  });
}
```

### 6. Network Optimization

Use request batching when possible:

```javascript
async function fetchDashboardData() {
  // Fetch multiple data sources in parallel
  const [broadcasts, adverts, polls] = await Promise.all([
    getBroadcastFeed(10, 0),
    getActiveAdverts(userProfile),
    getActivePolls()
  ]);

  return { broadcasts, adverts, polls };
}
```

---

## Testing

### Sample Test Cases

```javascript
// Test broadcast feed
describe('Broadcast Feed', () => {
  it('should fetch broadcasts with pagination', async () => {
    const broadcasts = await getBroadcastFeed(10, 0);
    expect(broadcasts).toHaveLength(10);
    expect(broadcasts[0]).toHaveProperty('message_text');
  });

  it('should handle like/unlike correctly', async () => {
    const result = await toggleBroadcastLike('broadcast-id', 'user-id');
    expect(result).toHaveProperty('liked');
  });
});

// Test polls
describe('Polls', () => {
  it('should prevent double voting', async () => {
    await submitPollVote('poll-id', 'option-id', 'user-id');

    await expect(
      submitPollVote('poll-id', 'option-id', 'user-id')
    ).rejects.toThrow('already voted');
  });
});
```

---

## Support

For issues or questions:
- Backend API: Contact backend team
- Database schema: See migrations in `supabase/migrations/`
- Authentication: Refer to Supabase Auth documentation

## Changelog

- **v1.0.0** (2025-10-20): Initial API documentation
  - Broadcasts API
  - Adverts API
  - Polls API
  - Communities API
  - Real-time subscriptions
