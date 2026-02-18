import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  related_id: string | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showPopup: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  onNotificationPopup?: (notification: Notification) => void;
}

export function NotificationProvider({ children, onNotificationPopup }: NotificationProviderProps) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('push_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('push_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;

      const now = new Date().toISOString();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: now })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const showPopup = useCallback((notification: Notification) => {
    if (onNotificationPopup) {
      onNotificationPopup(notification);
    }
  }, [onNotificationPopup]);

  useEffect(() => {
    if (!profile?.id) return;

    fetchNotifications();

    const notificationChannel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'push_notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          showPopup(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'push_notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;

          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );

          if (updatedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      notificationChannel.unsubscribe();
      supabase.removeChannel(notificationChannel);
    };
  }, [profile?.id, fetchNotifications, showPopup]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showPopup,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
        loading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
