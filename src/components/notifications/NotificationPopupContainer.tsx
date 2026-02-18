import { useState, useCallback } from 'react';
import NotificationPopup from './NotificationPopup';
import type { Notification } from '@/contexts/NotificationContext';

interface PopupNotification extends Notification {
  popupId: string;
}

interface NotificationPopupContainerProps {
  onMarkAsRead?: (id: string) => void;
}

export default function NotificationPopupContainer({ onMarkAsRead }: NotificationPopupContainerProps) {
  const [popupNotifications, setPopupNotifications] = useState<PopupNotification[]>([]);

  const addNotification = useCallback((notification: Notification) => {
    const popupId = `${notification.id}-${Date.now()}`;
    setPopupNotifications(prev => [
      ...prev.slice(-2),
      { ...notification, popupId },
    ]);
  }, []);

  const removeNotification = useCallback((popupId: string) => {
    setPopupNotifications(prev => prev.filter(n => n.popupId !== popupId));
  }, []);

  return (
    <>
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
            onMarkAsRead={onMarkAsRead}
          />
        </div>
      ))}
    </>
  );
}
