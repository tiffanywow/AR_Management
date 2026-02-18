# Mobile App Notifications API Guide

This guide explains how the mobile app can retrieve and manage notifications.

## Base URL

```
https://dowsehmvxnglhkjgmzin.supabase.co/functions/v1
```

---

## 1. Get Notifications

Retrieve notifications for a specific user.

**Endpoint:** `GET /get-notifications`

**Query Parameters:**
- `user_email` (required): The user's email address
- `unread_only` (optional): Set to `true` to get only unread notifications. Default: `false`
- `limit` (optional): Maximum number of notifications to return. Default: `50`

**Example Request:**

```bash
# Get all notifications for a user
curl "https://dowsehmvxnglhkjgmzin.supabase.co/functions/v1/get-notifications?user_email=user@example.com"

# Get only unread notifications
curl "https://dowsehmvxnglhkjgmzin.supabase.co/functions/v1/get-notifications?user_email=user@example.com&unread_only=true"

# Get last 10 notifications
curl "https://dowsehmvxnglhkjgmzin.supabase.co/functions/v1/get-notifications?user_email=user@example.com&limit=10"
```

**Response:**

```json
{
  "success": true,
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user@example.com",
      "title": "Membership Approved",
      "message": "Your membership application has been approved. Welcome!",
      "type": "membership_approved",
      "data": {
        "membership_id": "123",
        "community_name": "Windhoek Community"
      },
      "is_read": false,
      "created_at": "2025-10-24T10:30:00Z",
      "read_at": null
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "user_id": "user@example.com",
      "title": "New Broadcast",
      "message": "Important announcement from the administrator",
      "type": "broadcast",
      "data": {
        "broadcast_id": "456",
        "priority": "high"
      },
      "is_read": false,
      "created_at": "2025-10-24T09:15:00Z",
      "read_at": null
    }
  ],
  "count": 2
}
```

---

## 2. Mark Notification as Read

Mark one or all notifications as read for a user.

**Endpoint:** `POST /mark-notification-read`

**Request Body:**

```json
{
  "user_email": "user@example.com",
  "notification_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Or mark all as read:**

```json
{
  "user_email": "user@example.com",
  "mark_all": true
}
```

**Example Request:**

```bash
# Mark specific notification as read
curl -X POST "https://dowsehmvxnglhkjgmzin.supabase.co/functions/v1/mark-notification-read" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "user@example.com",
    "notification_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Mark all notifications as read
curl -X POST "https://dowsehmvxnglhkjgmzin.supabase.co/functions/v1/mark-notification-read" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "user@example.com",
    "mark_all": true
  }'
```

**Response:**

```json
{
  "success": true,
  "updated_count": 1,
  "message": "Notification marked as read"
}
```

---

## Notification Types

The `type` field indicates what kind of notification it is:

- `membership_approved` - User's membership was approved
- `membership_rejected` - User's membership was rejected
- `broadcast` - General announcement from administrators
- `campaign_update` - Campaign-related updates
- `poll_created` - New poll available
- `event_reminder` - Upcoming event reminder
- `donation_received` - Donation confirmation

---

## Notification Data Structure

Each notification includes a `data` field (JSON) with additional context:

**Example for membership_approved:**
```json
{
  "membership_id": "123",
  "community_name": "Windhoek Community",
  "approval_date": "2025-10-24"
}
```

**Example for broadcast:**
```json
{
  "broadcast_id": "456",
  "priority": "high",
  "category": "announcement"
}
```

---

## Polling Strategy

Recommended approach for the mobile app:

1. **On app launch:** Fetch all unread notifications
2. **Periodic polling:** Check for new notifications every 30-60 seconds when app is active
3. **On notification tap:** Mark as read using the mark-notification-read endpoint
4. **Badge count:** Use the count of unread notifications for app badge

**Example polling code (pseudo-code):**

```javascript
// On app launch
async function loadNotifications() {
  const response = await fetch(
    `${BASE_URL}/get-notifications?user_email=${userEmail}&unread_only=true`
  );
  const { notifications, count } = await response.json();

  // Update badge count
  updateBadgeCount(count);

  // Show notifications in app
  displayNotifications(notifications);
}

// Poll every 60 seconds
setInterval(async () => {
  await loadNotifications();
}, 60000);

// Mark as read when user taps notification
async function handleNotificationTap(notificationId) {
  await fetch(`${BASE_URL}/mark-notification-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      notification_id: notificationId
    })
  });

  // Refresh notifications
  await loadNotifications();
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common errors:**
- `400 Bad Request` - Missing required parameters
- `500 Internal Server Error` - Server-side error

---

## Testing

You can test the API using curl or any HTTP client:

```bash
# Test getting notifications (replace with real email)
curl "https://dowsehmvxnglhkjgmzin.supabase.co/functions/v1/get-notifications?user_email=test@example.com"
```

---

## Notes

- No authentication required for these endpoints (they use email as identifier)
- Notifications are automatically created by the system when events occur
- Old notifications are not automatically deleted (implement cleanup if needed)
- The API returns notifications in descending order (newest first)
