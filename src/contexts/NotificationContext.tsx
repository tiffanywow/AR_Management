import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.email) {
      console.log('No profile email available for fetching notifications');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching notifications for user:', profile.email);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.email)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase error fetching notifications:', error);
        throw error;
      }

      console.log('Fetched notifications:', data?.length || 0);

      const mappedData = (data || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        notification_type: n.type,
        title: n.title,
        body: n.message,
        data: n.data,
        related_id: n.data?.related_id || null,
        is_read: n.is_read,
        read_at: n.read_at,
        sent_at: n.created_at,
        created_at: n.created_at,
      }));

      setNotifications(mappedData);
      setUnreadCount(mappedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [profile?.email]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
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
    if (!profile?.email) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', profile.email)
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
    if (!profile?.email) return;

    fetchNotifications();

    let notificationChannel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      try {
        notificationChannel = supabase
          .channel(`notifications:${profile.email}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${profile.email}`,
            },
            (payload) => {
              console.log('New notification received:', payload.new);
              const rawNotification = payload.new as any;

              const newNotification: Notification = {
                id: rawNotification.id,
                user_id: rawNotification.user_id,
                notification_type: rawNotification.type,
                title: rawNotification.title,
                body: rawNotification.message,
                data: rawNotification.data,
                related_id: rawNotification.data?.related_id || null,
                is_read: rawNotification.is_read,
                read_at: rawNotification.read_at,
                sent_at: rawNotification.created_at,
                created_at: rawNotification.created_at,
              };

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
              table: 'notifications',
              filter: `user_id=eq.${profile.email}`,
            },
            (payload) => {
              console.log('Notification updated:', payload.new);
              const rawNotification = payload.new as any;

              const updatedNotification: Notification = {
                id: rawNotification.id,
                user_id: rawNotification.user_id,
                notification_type: rawNotification.type,
                title: rawNotification.title,
                body: rawNotification.message,
                data: rawNotification.data,
                related_id: rawNotification.data?.related_id || null,
                is_read: rawNotification.is_read,
                read_at: rawNotification.read_at,
                sent_at: rawNotification.created_at,
                created_at: rawNotification.created_at,
              };

              setNotifications(prev =>
                prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
              );

              if (updatedNotification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
          });

        setChannel(notificationChannel);
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
        console.log('Notification channel cleaned up');
      }
    };
  }, [profile?.email, showPopup, fetchNotifications]);

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
