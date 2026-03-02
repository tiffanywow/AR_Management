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
      // insert into legacy notifications table (expecting email in user_id)
      let legacyUserId = params.user_id;
      // if it looks like a UUID (no @ symbol) fetch corresponding email
      if (legacyUserId && !legacyUserId.includes('@')) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', legacyUserId)
          .single();
        if (profileData?.email) {
          legacyUserId = profileData.email;
        } else {
          console.warn(
            'useCreateNotification: unable to resolve UUID to email for legacy notification, skipping legacy insert',
            params.user_id
          );
          legacyUserId = null;
        }
      }
      let data = null;
      let error = null;
      if (legacyUserId) {
        const result = await supabase
          .from('notifications')
          .insert({
            user_id: legacyUserId,
            type: params.notification_type,
            title: params.title,
            message: params.body,
            data: params.data || null,
            is_read: false,
          })
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // skip legacy insert when we don't have a valid email
      }


      // also insert into push_notifications for dashboard/real-time
      // make sure user_id is a uuid; if caller passed email, look up the id
      let pushUserId = params.user_id;
      if (pushUserId && pushUserId.includes('@')) {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', pushUserId)
          .single();
        if (profileByEmail?.id) {
          // ensure the ID we got is actually a UUID (the profiles table should normally store uuids)
          const maybeId = profileByEmail.id;
          const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
          if (uuidRegex.test(maybeId)) {
            pushUserId = maybeId;
          } else {
            console.warn(
              'useCreateNotification: profile.id is not a valid uuid, skipping push insert for',
              maybeId
            );
            pushUserId = null;
          }
        } else {
          console.warn(
            'useCreateNotification: unable to resolve email to UUID for push notification, skipping push insert',
            params.user_id
          );
          pushUserId = null; // clear so we don't try to insert invalid value
        }
      }
      const allowed = ['new_post','new_poll','new_campaign','campaign_update','general'];
      const pushType = allowed.includes(params.notification_type) ? params.notification_type : 'general';
      let pushError = null;
      if (pushUserId) {
        const result = await supabase
          .from('push_notifications')
          .insert({
            user_id: pushUserId,
            notification_type: pushType,
            title: params.title,
            body: params.body,
            data: params.data || null,
            related_id: null,
            is_read: false,
          });
        pushError = result.error;
      }


      if (error) throw error;
      if (pushError) console.error('push notification creation error', pushError);

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
      const now = new Date().toISOString();
      const notifications = user_ids.map(user_id => ({
        user_id,
        type: notification.notification_type,
        title: notification.title,
        message: notification.body,
        data: notification.data || null,
        is_read: false,
        created_at: now,
      }));

      // translate any email addresses to UUIDs for push table
      const pushNotifications = [] as any[];
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      for (let user_id of user_ids) {
        let pushUser = user_id;
        if (pushUser && pushUser.includes('@')) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', pushUser)
            .single();
          if (profileByEmail?.id) {
            if (uuidRegex.test(profileByEmail.id)) {
              pushUser = profileByEmail.id;
            } else {
              console.warn('createBulkNotifications: profile.id is not uuid, skipping push insert for', profileByEmail.id);
              pushUser = null;
            }
          } else {
            console.warn('createBulkNotifications: skipping push insert for unknown email', pushUser);
            pushUser = null;
          }
        }
        if (pushUser) {
          pushNotifications.push({
            user_id: pushUser,
            notification_type: notification.notification_type,
            title: notification.title,
            body: notification.body,
            data: notification.data || null,
            related_id: null,
            is_read: false,
            created_at: now,
          });
        }
      }

      const [{ data, error }, { error: pushError }] = await Promise.all([
        supabase.from('notifications').insert(notifications).select(),
        supabase.from('push_notifications').insert(pushNotifications),
      ]);

      if (error) throw error;
      if (pushError) console.error('push notifications bulk insert error', pushError);

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
