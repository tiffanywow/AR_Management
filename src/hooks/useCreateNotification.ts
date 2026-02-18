import { supabase } from '@/lib/supabase';

export interface CreateNotificationParams {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  related_id?: string;
}

export function useCreateNotification() {
  const createNotification = async (params: CreateNotificationParams) => {
    try {
      const { data, error } = await supabase
        .from('push_notifications')
        .insert({
          user_id: params.user_id,
          notification_type: params.notification_type,
          title: params.title,
          body: params.body,
          data: params.data || null,
          related_id: params.related_id || null,
          is_read: false,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }
  };

  const createBulkNotifications = async (
    user_ids: string[],
    notification: Omit<CreateNotificationParams, 'user_id'>
  ) => {
    try {
      const notifications = user_ids.map(user_id => ({
        user_id,
        notification_type: notification.notification_type,
        title: notification.title,
        body: notification.body,
        data: notification.data || null,
        related_id: notification.related_id || null,
        is_read: false,
        sent_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('push_notifications')
        .insert(notifications)
        .select();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      return { success: false, error };
    }
  };

  return {
    createNotification,
    createBulkNotifications,
  };
}
