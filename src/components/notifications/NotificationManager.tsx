import { useState, useRef, useCallback } from 'react';
import NotificationPopup from './NotificationPopup';
import { NotificationProvider } from '@/contexts/NotificationContext';
import type { Notification } from '@/contexts/NotificationContext';

interface PopupNotification extends Notification {
  popupId: string;
}

interface NotificationManagerProps {
  children: React.ReactNode;
}

function NotificationManagerInner({ children, onNotificationPopup }: {
  children: React.ReactNode;
  onNotificationPopup: (notification: Notification) => void;
}) {
  return (
    <NotificationProvider onNotificationPopup={onNotificationPopup}>
      {children}
    </NotificationProvider>
  );
}

export default function NotificationManager({ children }: NotificationManagerProps) {
  const [popupNotifications, setPopupNotifications] = useState<PopupNotification[]>([]);
  const counterRef = useRef(0);

  const handleNewNotification = useCallback((notification: Notification) => {
    const popupId = `${notification.id}-${counterRef.current++}`;

    setPopupNotifications(prev => {
      const filtered = prev.slice(-2);
      return [...filtered, { ...notification, popupId }];
    });
  }, []);

  const removeNotification = useCallback((popupId: string) => {
    setPopupNotifications(prev => prev.filter(n => n.popupId !== popupId));
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    console.log('Marking notification as read:', id);
  }, []);

  return (
    <>
      <NotificationManagerInner onNotificationPopup={handleNewNotification}>
        {children}
      </NotificationManagerInner>

      {popupNotifications.map((notification, index) => (
        <div
          key={notification.popupId}
          style={{
            position: 'fixed',
            top: `${16 + index * 140}px`,
            right: '16px',
            zIndex: 100,
          }}
        >
          <NotificationPopup
            notification={notification}
            onClose={() => removeNotification(notification.popupId)}
            onMarkAsRead={markAsRead}
          />
        </div>
      ))}
    </>
  );
}
