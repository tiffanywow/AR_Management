import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell, DollarSign, Gift, ShoppingCart, Heart, MessageCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification } from '@/contexts/NotificationContext';

interface NotificationPopupProps {
  notification: Notification;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
  autoCloseDuration?: number;
}

export default function NotificationPopup({
  notification,
  onClose,
  onMarkAsRead,
  autoCloseDuration = 8000,
}: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);

    const timer = setTimeout(() => {
      handleClose();
    }, autoCloseDuration);

    return () => clearTimeout(timer);
  }, [autoCloseDuration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const getIcon = () => {
    switch (notification.notification_type) {
      case 'success':
      case 'membership_approved':
      case 'approval':
      case 'order_confirmed':
      case 'payment_confirmed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
      case 'membership_rejected':
      case 'payment_failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
      case 'approval_required':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'donation_received':
      case 'donation_confirmed':
        return <Gift className="h-5 w-5 text-purple-600" />;
      case 'order_placed':
      case 'order_shipped':
        return <ShoppingCart className="h-5 w-5 text-blue-600" />;
      case 'broadcast_like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'broadcast_comment':
      case 'broadcast_reply':
        return <MessageCircle className="h-5 w-5 text-blue-600" />;
      case 'campaign_update':
      case 'campaign_created':
        return <TrendingUp className="h-5 w-5 text-indigo-600" />;
      case 'broadcast':
      case 'new_post':
        return <Bell className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.notification_type) {
      case 'success':
      case 'membership_approved':
      case 'approval':
      case 'order_confirmed':
      case 'payment_confirmed':
      case 'payment_received':
        return 'bg-green-50 border-green-200';
      case 'error':
      case 'membership_rejected':
      case 'payment_failed':
        return 'bg-red-50 border-red-200';
      case 'warning':
      case 'approval_required':
        return 'bg-yellow-50 border-yellow-200';
      case 'donation_received':
      case 'donation_confirmed':
        return 'bg-purple-50 border-purple-200';
      case 'order_placed':
      case 'order_shipped':
        return 'bg-blue-50 border-blue-200';
      case 'broadcast_like':
        return 'bg-red-50 border-red-200';
      case 'broadcast_comment':
      case 'broadcast_reply':
        return 'bg-blue-50 border-blue-200';
      case 'campaign_update':
      case 'campaign_created':
        return 'bg-indigo-50 border-indigo-200';
      case 'broadcast':
      case 'new_post':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-[100] w-96 max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out',
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div
        className={cn(
          'rounded-lg border shadow-lg p-4 cursor-pointer backdrop-blur-sm',
          getBackgroundColor(),
          'hover:shadow-xl transition-shadow'
        )}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
                {notification.title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>

            <p className="text-sm text-gray-700 mt-1 line-clamp-3">
              {notification.body}
            </p>

            {notification.data?.action && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                >
                  {notification.data.action}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-[#d1242a] transition-all ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${autoCloseDuration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
