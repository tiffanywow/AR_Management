# Notification System Enhancement Guide

## Current Status

The AR Management platform has a **fully functional notification system** with:

✅ Real-time notifications via Supabase Realtime
✅ Pop-up alerts for new notifications
✅ Notification center dropdown in header
✅ Read/unread status tracking
✅ Database triggers for broadcasts
✅ Helper functions for creating notifications

## What's Already Working

### 1. Core Infrastructure
- `NotificationContext` - Manages notification state
- `NotificationManager` - Handles pop-up rendering
- `NotificationPopup` - Individual pop-up component
- `NotificationsDropdown` - Header dropdown menu
- `useCreateNotification` - Hook for creating notifications

### 2. Database Tables
- `push_notifications` - Stores all notifications
- Row-Level Security (RLS) enabled
- Real-time subscriptions active

### 3. Existing Triggers
- **Broadcast Notifications**: Automatically created when posts are published
- Notifies all active party members

## What Needs to Be Added

### Database Triggers for Business Events

To enable automatic notifications across the platform, apply this migration:

```sql
-- File: supabase/migrations/expand_notification_system.sql

/*
  Expand notification types and add triggers for:
  - Donations
  - Store orders
  - Broadcast likes/comments
  - Poll votes
*/

-- 1. Expand notification types
ALTER TABLE push_notifications DROP CONSTRAINT IF EXISTS push_notifications_notification_type_check;

ALTER TABLE push_notifications
ADD CONSTRAINT push_notifications_notification_type_check
CHECK (notification_type IN (
  'new_post', 'new_poll', 'new_campaign', 'campaign_update',
  'campaign_created', 'campaign_completed', 'general', 'info',
  'success', 'warning', 'error', 'payment_received',
  'payment_confirmed', 'payment_failed', 'donation_received',
  'donation_confirmed', 'order_placed', 'order_confirmed',
  'order_shipped', 'broadcast_like', 'broadcast_comment',
  'broadcast_reply', 'poll_vote', 'poll_ended', 'poll_created',
  'membership_approved', 'membership_rejected', 'approval_required',
  'broadcast', 'system_update'
));

-- 2. Donation notifications
CREATE OR REPLACE FUNCTION notify_donation_received()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'confirmed' THEN
    INSERT INTO push_notifications (user_id, notification_type, title, body, related_id, data)
    SELECT p.id, 'donation_received', 'New Donation Received',
      'A donation of N$' || NEW.amount::text || ' has been received',
      NEW.id, jsonb_build_object('amount', NEW.amount, 'payment_method', NEW.payment_method)
    FROM profiles p
    WHERE p.role IN ('super_admin', 'administrator', 'finance') AND p.is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS donation_notification_trigger ON donations;
CREATE TRIGGER donation_notification_trigger
  AFTER INSERT OR UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION notify_donation_received();

-- 3. Store order notifications
CREATE OR REPLACE FUNCTION notify_order_placed()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO push_notifications (user_id, notification_type, title, body, related_id, data)
    SELECT p.id, 'order_placed', 'New Store Order',
      'A new order #' || NEW.order_number || ' has been placed',
      NEW.id, jsonb_build_object('order_number', NEW.order_number, 'total_amount', NEW.total_amount)
    FROM profiles p
    WHERE p.role IN ('super_admin', 'administrator') AND p.is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS order_notification_trigger ON store_orders;
CREATE TRIGGER order_notification_trigger
  AFTER INSERT ON store_orders
  FOR EACH ROW EXECUTE FUNCTION notify_order_placed();

-- 4. Broadcast like notifications
CREATE OR REPLACE FUNCTION notify_broadcast_like()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_liker_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT b.created_by, p.full_name INTO v_author_id, v_liker_name
    FROM broadcasts b
    LEFT JOIN profiles p ON p.id = NEW.user_id
    WHERE b.id = NEW.broadcast_id;

    IF v_author_id IS NOT NULL AND v_author_id != NEW.user_id THEN
      INSERT INTO push_notifications (user_id, notification_type, title, body, related_id, data)
      VALUES (v_author_id, 'broadcast_like', 'New Like on Your Post',
        COALESCE(v_liker_name, 'Someone') || ' liked your post',
        NEW.broadcast_id, jsonb_build_object('liker_id', NEW.user_id, 'liker_name', v_liker_name));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS broadcast_like_notification_trigger ON broadcast_likes;
CREATE TRIGGER broadcast_like_notification_trigger
  AFTER INSERT ON broadcast_likes
  FOR EACH ROW EXECUTE FUNCTION notify_broadcast_like();

-- 5. Broadcast comment notifications
CREATE OR REPLACE FUNCTION notify_broadcast_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_commenter_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT b.created_by, p.full_name INTO v_author_id, v_commenter_name
    FROM broadcasts b
    LEFT JOIN profiles p ON p.id = NEW.user_id
    WHERE b.id = NEW.broadcast_id;

    IF v_author_id IS NOT NULL AND v_author_id != NEW.user_id THEN
      INSERT INTO push_notifications (user_id, notification_type, title, body, related_id, data)
      VALUES (v_author_id, 'broadcast_comment', 'New Comment on Your Post',
        COALESCE(v_commenter_name, 'Someone') || ' commented: ' || LEFT(NEW.comment_text, 50),
        NEW.broadcast_id, jsonb_build_object('commenter_id', NEW.user_id, 'commenter_name', v_commenter_name));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS broadcast_comment_notification_trigger ON broadcast_comments;
CREATE TRIGGER broadcast_comment_notification_trigger
  AFTER INSERT ON broadcast_comments
  FOR EACH ROW EXECUTE FUNCTION notify_broadcast_comment();
```

## How to Use Notifications

### From Frontend Components

```tsx
import { useCreateNotification } from '@/hooks/useCreateNotification';
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { createNotification, createBulkNotifications } = useCreateNotification();
  const { profile } = useAuth();

  // Notify single user
  const notifyUser = async () => {
    await createNotification({
      user_id: userId,
      notification_type: 'payment_received',
      title: 'Payment Confirmed',
      body: 'Your payment of N$500 has been confirmed.',
      data: { amount: 500, reference: 'PAY-123' },
      related_id: paymentId,
    });
  };

  // Notify multiple users
  const notifyMembers = async (memberIds: string[]) => {
    await createBulkNotifications(memberIds, {
      notification_type: 'campaign_update',
      title: 'Campaign Update',
      body: 'The rally has been rescheduled to next Saturday.',
      related_id: campaignId,
    });
  };
}
```

### Notification Types & Icons

| Type | Icon | Usage |
|------|------|-------|
| `payment_received` | 💰 | Payment confirmed |
| `payment_failed` | ❌ | Payment failed |
| `donation_received` | 🎁 | New donation |
| `order_placed` | 🛒 | New store order |
| `order_confirmed` | ✅ | Order confirmed |
| `broadcast_like` | ❤️ | Post liked |
| `broadcast_comment` | 💬 | New comment |
| `poll_vote` | 📊 | New poll vote |
| `membership_approved` | ✅ | Membership approved |
| `membership_rejected` | ❌ | Membership rejected |
| `campaign_update` | 📢 | Campaign update |
| `approval_required` | ⚠️ | Action needed |
| `success` | ✅ | Success message |
| `error` | ❌ | Error message |
| `info` | ℹ️ | Information |

## Testing

1. Visit `/notification-test` to test all notification types
2. Create test scenarios for:
   - Donations
   - Store orders
   - Broadcast interactions
   - Poll votes
   - Campaign updates

## Performance Considerations

- Notifications are limited to 50 per user in initial fetch
- Pop-ups are limited to 3 visible at once
- Real-time subscriptions are scoped per user
- Triggers use `SECURITY DEFINER` for proper permissions

## Next Steps

1. Apply the database migration (see SQL above)
2. Update frontend components to use notifications
3. Test notification delivery across all events
4. Configure notification preferences (future enhancement)
