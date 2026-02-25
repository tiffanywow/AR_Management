import { supabase } from '@/lib/supabase';

export interface CreateNotificationParams {
  user_id: string | null;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export function useCreateNotification() {
  const createNotification = async (params: CreateNotificationParams) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.user_id,
          type: params.notification_type,
          title: params.title,
          message: params.body,
          data: params.data || null,
          is_read: false,
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
        type: notification.notification_type,
        title: notification.title,
        message: notification.body,
        data: notification.data || null,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('notifications')
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
