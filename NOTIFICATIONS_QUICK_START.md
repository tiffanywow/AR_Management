# Notification System - Quick Start Guide

## What's Included

The in-app notification system is now fully operational with:

1. **Real-time pop-up notifications** that appear in the top-right corner
2. **Notification bell dropdown** in the header showing all notifications
3. **Unread count badge** on the bell icon
4. **Auto-dismiss** after 8 seconds with manual close option
5. **Real-time updates** via Supabase subscriptions (no polling)
6. **Multiple notification types** with different colors and icons

## Quick Usage

### Send a Notification (Frontend)

```tsx
import { useCreateNotification } from '@/hooks/useCreateNotification';

function MyComponent() {
  const { createNotification } = useCreateNotification();

  const notifyUser = async () => {
    await createNotification({
      user_id: 'user-uuid-here',
      notification_type: 'success',
      title: 'Action Complete',
      body: 'Your request was processed successfully.',
    });
  };
}
```

### Send a Notification (Database Trigger)

```sql
-- From a database trigger or function
SELECT create_notification(
  user_id,
  'membership_approved',
  'Membership Approved',
  'Welcome! Your membership has been approved.'
);
```

### Notify All Admins

```sql
SELECT notify_all_admins(
  'approval_required',
  'New Approval Request',
  'A new item requires your review.'
);
```

## Test the System

Visit `/notification-test` in your application to:
- Test different notification types
- See pop-ups in action
- Create custom notifications
- View documentation

## Notification Types

- `success` - Green checkmark icon
- `error` - Red alert icon
- `warning` - Yellow warning icon
- `info` - Blue info icon
- `membership_approved` - Green checkmark
- `membership_rejected` - Red X
- `broadcast` - Blue bell icon
- `approval` - Green checkmark
- `campaign_update` - Custom icons
- `poll_created` - Custom icons

## Where Notifications Appear

1. **Pop-up Alert**: Top-right corner, auto-dismisses after 8 seconds
2. **Bell Dropdown**: Click the bell icon in the header
3. **Unread Badge**: Red badge showing count on bell icon

## Real-time Features

When a new notification is created:
1. It immediately appears as a pop-up
2. The bell icon updates with the new count
3. The dropdown list updates automatically
4. No page refresh needed

## Database Functions Available

- `create_notification(user_id, type, title, body, data, related_id)` - Single notification
- `create_bulk_notifications(user_ids[], type, title, body, data, related_id)` - Multiple users
- `notify_all_admins(type, title, body, data, related_id)` - All admins
- `notify_by_role(roles[], type, title, body, data, related_id)` - By role

## Integration Examples

### When Membership Approved
```tsx
await createNotification({
  user_id: membership.user_id,
  notification_type: 'membership_approved',
  title: 'Welcome to the Party!',
  body: `Your membership ${membership.membership_number} is now active.`,
  related_id: membership.id,
});
```

### When Campaign Updated
```tsx
await createBulkNotifications(
  campaignMembers.map(m => m.user_id),
  {
    notification_type: 'campaign_update',
    title: 'Campaign Schedule Change',
    body: 'The rally has been moved to 3 PM.',
    related_id: campaignId,
  }
);
```

### From Database Trigger
```sql
CREATE OR REPLACE FUNCTION notify_on_membership_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM create_notification(
      NEW.user_id,
      'membership_approved',
      'Membership Approved!',
      'Congratulations! Your membership has been approved.',
      jsonb_build_object('membership_id', NEW.id),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Need Help?

- Full documentation: See `NOTIFICATION_SYSTEM.md`
- Test page: Visit `/notification-test`
- Component locations:
  - Context: `src/contexts/NotificationContext.tsx`
  - Pop-up: `src/components/notifications/NotificationPopup.tsx`
  - Hook: `src/hooks/useCreateNotification.ts`
