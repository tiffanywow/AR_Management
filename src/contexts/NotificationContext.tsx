import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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

  const resolveProfileUuid = useCallback(async (): Promise<string | null> => {
    if (!profile?.id && !profile?.email) return null;
    if (profile?.id && uuidRegex.test(profile.id)) return profile.id;

    const email = profile?.email || (profile?.id?.includes('@') ? profile.id : null);
    if (!email) return null;

    const { data: maybe, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (error) {
      console.warn('NotificationContext: cannot resolve profile uuid', error);
      return null;
    }

    const maybeId = maybe?.id as unknown as string | undefined;
    if (maybeId && uuidRegex.test(maybeId)) return maybeId;
    return null;
  }, [profile?.id, profile?.email]);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id && !profile?.email) return;

    setLoading(true);
    try {
      const userUuid = await resolveProfileUuid();
      if (!userUuid) return;

      // fetch from both push_notifications and notifications (both uuid user_id)
      const [pushResult, legacyResult] = await Promise.all([
        supabase
          .from('push_notifications')
          .select('*')
          .eq('user_id', userUuid)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userUuid)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (pushResult.error) console.error('push notifications fetch error', pushResult.error);
      if (legacyResult.error) console.error('notifications fetch error', legacyResult.error);

      const pushData = pushResult.data || [];
      const legacyData = (legacyResult.data || []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        notification_type: n.type,
        title: n.title,
        body: n.message,
        data: n.data,
        related_id: null,
        is_read: n.is_read,
        read_at: n.read_at,
        sent_at: null,
        created_at: n.created_at,
      }));

      // merge and sort by timestamp
      const all = [...pushData, ...legacyData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

      setNotifications(all);
      setUnreadCount(all.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.email, resolveProfileUuid]);

  const markAsRead = async (notificationId: string) => {
    try {
      // update both tables in case the notification lives in either one
      await Promise.all([
        supabase
          .from('push_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId),
        supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId),
      ]);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  const markAllAsRead = async () => {
    const userUuid = await resolveProfileUuid();
    if (!userUuid) return;

    try {
      const now = new Date().toISOString();
      await Promise.all([
        supabase
          .from('push_notifications')
          .update({ is_read: true, read_at: now })
          .eq('user_id', userUuid)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .update({ is_read: true, read_at: now })
          .eq('user_id', userUuid)
          .eq('is_read', false),
      ]);

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
    if (!profile?.id && !profile?.email) return;

    let pushChannel: any = null;
    let notificationsChannel: any = null;

    const init = async () => {
      // refresh first
      await fetchNotifications();

      const subId = await resolveProfileUuid();

      if (subId) {
        pushChannel = supabase
          .channel(`push_notifications:${subId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'push_notifications',
              filter: `user_id=eq.${subId}`,
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
              filter: `user_id=eq.${subId}`,
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

        notificationsChannel = supabase
          .channel(`notifications:${subId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${subId}`,
            },
            (payload) => {
              const n = payload.new as any;
              const newNotification: Notification = {
                id: n.id,
                user_id: n.user_id,
                notification_type: n.type,
                title: n.title,
                body: n.message,
                data: n.data,
                related_id: null,
                is_read: n.is_read,
                read_at: n.read_at,
                sent_at: null,
                created_at: n.created_at,
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
              filter: `user_id=eq.${subId}`,
            },
            (payload) => {
              const n = payload.new as any;
              const updatedNotification: Notification = {
                id: n.id,
                user_id: n.user_id,
                notification_type: n.type,
                title: n.title,
                body: n.message,
                data: n.data,
                related_id: null,
                is_read: n.is_read,
                read_at: n.read_at,
                sent_at: null,
                created_at: n.created_at,
              };

              setNotifications(prev =>
                prev.map(x => x.id === updatedNotification.id ? updatedNotification : x)
              );

              if (updatedNotification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          )
          .subscribe();
      }
    };

    init();

    return () => {
      if (pushChannel) {
        pushChannel.unsubscribe();
        supabase.removeChannel(pushChannel);
      }
      if (notificationsChannel) {
        notificationsChannel.unsubscribe();
        supabase.removeChannel(notificationsChannel);
      }
    };
  }, [profile?.id, profile?.email, fetchNotifications, showPopup, resolveProfileUuid]);

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
