import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationsDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    loading,
  } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'membership_approved':
        return '✅';
      case 'membership_rejected':
        return '❌';
      case 'new_post':
      case 'broadcast':
        return '📢';
      case 'campaign_update':
      case 'campaign_created':
        return '📊';
      case 'poll_created':
      case 'poll_vote':
        return '📋';
      case 'poll_ended':
        return '🏁';
      case 'payment_received':
      case 'payment_confirmed':
        return '💰';
      case 'payment_failed':
        return '❌';
      case 'donation_received':
      case 'donation_confirmed':
        return '🎁';
      case 'order_placed':
        return '🛒';
      case 'order_confirmed':
        return '✅';
      case 'order_shipped':
        return '📦';
      case 'broadcast_like':
        return '❤️';
      case 'broadcast_comment':
      case 'broadcast_reply':
        return '💬';
      case 'approval_required':
        return '⚠️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      case 'general':
        return 'ℹ️';
      case 'system_update':
        return '🔧';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative bg-gray-100 hover:bg-gray-200 text-gray-700">
          <Bell className="h-5 w-5" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-gray-700 rounded-full text-xs text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7 bg-gray-800 hover:bg-gray-700 text-white"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Bell className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900 line-clamp-1">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-gray-700 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t px-4 py-2 text-center">
            <button
              onClick={refreshNotifications}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-md transition-colors"
            >
              Refresh notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
