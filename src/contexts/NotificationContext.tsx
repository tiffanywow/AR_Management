import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
  // Use a ref instead of state to avoid stale-closure issues in cleanup
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) {
      console.log('No profile ID available for fetching notifications');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching notifications for user:', profile.id);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('Fetched notifications:', data?.length || 0);

      const mappedData = (data || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        notification_type: n.type,
        title: n.title,
        body: n.message,
        data: n.data,
        is_read: n.is_read,
        read_at: n.read_at,
        sent_at: n.created_at,
        created_at: n.created_at,
      }));

      setNotifications(mappedData);
      setUnreadCount(mappedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

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
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
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

    // Remove any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const notificationChannel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const rawNotification = payload.new as any;
          const newNotification: Notification = {
            id: rawNotification.id,
            user_id: rawNotification.user_id,
            notification_type: rawNotification.type,
            title: rawNotification.title,
            body: rawNotification.message,
            data: rawNotification.data,
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
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const rawNotification = payload.new as any;
          const updatedNotification: Notification = {
            id: rawNotification.id,
            user_id: rawNotification.user_id,
            notification_type: rawNotification.type,
            title: rawNotification.title,
            body: rawNotification.message,
            data: rawNotification.data,
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
      .subscribe();

    // Store in ref so cleanup always has the latest reference
    channelRef.current = notificationChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, showPopup, fetchNotifications]);

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
