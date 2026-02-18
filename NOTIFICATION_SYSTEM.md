# In-App Notification System

A comprehensive real-time notification system with pop-up alerts for the AR Management platform.

## Features

- **Real-time Notifications**: Instant delivery using Supabase Realtime
- **Pop-up Alerts**: Automatic pop-ups for new notifications with smooth animations
- **Notification Center**: Dropdown menu showing all notifications with unread count
- **Auto-dismiss**: Pop-ups automatically close after 8 seconds
- **Multiple Notification Types**: Success, error, warning, info, broadcasts, approvals, etc.
- **Bulk Notifications**: Send to multiple users or all admins at once
- **Read/Unread Status**: Track which notifications have been read
- **Stacked Pop-ups**: Multiple notifications stack gracefully

## Components

### 1. NotificationContext
Provider that manages notification state and real-time subscriptions.

```tsx
import { useNotifications } from '@/contexts/NotificationContext';

const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
```

### 2. NotificationPopup
Individual pop-up component with animations and auto-dismiss.

### 3. NotificationManager
Top-level component that handles pop-up rendering and stacking.

### 4. NotificationsDropdown
Header dropdown showing all notifications (already integrated).

## Usage

### Creating Notifications from Frontend

```tsx
import { useCreateNotification } from '@/hooks/useCreateNotification';

function MyComponent() {
  const { createNotification, createBulkNotifications } = useCreateNotification();

  // Single notification
  const sendNotification = async () => {
    await createNotification({
      user_id: userId,
      notification_type: 'success',
      title: 'Payment Received',
      body: 'Your payment of N$500 has been confirmed.',
      data: { amount: 500, transactionId: 'tx_123' },
      related_id: campaignId,
    });
  };

  // Multiple users
  const notifyMultiple = async () => {
    await createBulkNotifications(
      [userId1, userId2, userId3],
      {
        notification_type: 'broadcast',
        title: 'New Campaign Launch',
        body: 'Join us for the new campaign starting this weekend!',
      }
    );
  };
}
```

### Creating Notifications from Database Functions

```sql
-- Notify a single user
SELECT create_notification(
  '550e8400-e29b-41d4-a716-446655440000'::UUID, -- user_id
  'membership_approved',                         -- notification_type
  'Welcome to the Party!',                       -- title
  'Your membership has been approved.',          -- body
  '{"membership_number": "AR-2024-001"}'::JSONB, -- data (optional)
  NULL                                           -- related_id (optional)
);

-- Notify all admins
SELECT notify_all_admins(
  'approval_required',
  'New Membership Application',
  'A new member has submitted their application for review.'
);

-- Notify by role
SELECT notify_by_role(
  ARRAY['super_admin', 'administrator'],
  'system_update',
  'System Maintenance',
  'Scheduled maintenance tonight at 10 PM.'
);
```

### Notification Types

- `info` - General information
- `success` - Success messages
- `warning` - Warning messages
- `error` - Error messages
- `membership_approved` - Membership approval
- `membership_rejected` - Membership rejection
- `broadcast` - Important broadcasts
- `new_post` - New content
- `campaign_update` - Campaign updates
- `poll_created` - New polls
- `approval` - Generic approval notifications

Each type has its own icon and color scheme in the pop-up.

## Database Schema

### push_notifications table

```sql
CREATE TABLE push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  related_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

## Row Level Security

- Users can only read their own notifications
- Users can update their own notifications (mark as read)
- Admins can create notifications for any user
- Admins can view all notifications

## Real-time Subscriptions

The system automatically subscribes to:
- New notification inserts (triggers pop-up)
- Notification updates (updates read status)

No polling needed - updates are instant via Supabase Realtime.

## Testing

Visit `/notification-test` in the application to test the notification system with:
- Pre-configured quick tests for different notification types
- Custom notification builder
- Documentation and examples

## Integration Examples

### On Membership Approval

```tsx
await createNotification({
  user_id: membership.user_id,
  notification_type: 'membership_approved',
  title: 'Membership Approved!',
  body: `Welcome to the party! Your membership number is ${membershipNumber}.`,
  data: { membership_number: membershipNumber },
  related_id: membership.id,
});
```

### On Payment Received

```tsx
await createNotification({
  user_id: userId,
  notification_type: 'success',
  title: 'Payment Received',
  body: `Your payment of N$${amount} has been confirmed.`,
  data: { amount, payment_method, reference },
  related_id: paymentId,
});
```

### On Campaign Update

```tsx
const campaignMembers = await getCampaignMembers(campaignId);
await createBulkNotifications(
  campaignMembers.map(m => m.user_id),
  {
    notification_type: 'campaign_update',
    title: 'Campaign Update',
    body: 'The rally location has been changed to Community Hall.',
    related_id: campaignId,
  }
);
```

## Customization

### Auto-dismiss Duration

Pop-ups auto-dismiss after 8 seconds by default. To change this:

```tsx
<NotificationPopup
  notification={notification}
  autoCloseDuration={5000} // 5 seconds
  onClose={handleClose}
/>
```

### Pop-up Position

Pop-ups appear in the top-right corner. Position can be adjusted in `NotificationManager.tsx`:

```tsx
style={{
  position: 'fixed',
  top: `${16 + index * 140}px`,
  right: '16px', // Change to 'left: 16px' for left side
  zIndex: 100,
}}
```

## Performance

- Notifications are limited to 50 per user in initial fetch
- Real-time subscriptions are scoped to the logged-in user only
- Pop-ups are limited to 3 visible at once (older ones dismissed)
- Lightweight components with minimal re-renders

## Future Enhancements

- Push notifications for mobile apps
- Email notifications for critical alerts
- Notification preferences per user
- Scheduled notifications
- Notification categories with filters
- Sound alerts (optional)
