import { supabase } from '@/lib/supabase';

export interface CreateNotificationParams {
  user_id: string | null;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function resolveUserUuid(userIdOrEmail: string | null): Promise<string | null> {
  if (!userIdOrEmail) return null;
  if (uuidRegex.test(userIdOrEmail)) return userIdOrEmail;

  if (userIdOrEmail.includes('@')) {
    const { data: profileByEmail, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userIdOrEmail)
      .single();

    if (error) {
      console.warn('useCreateNotification: unable to resolve email to UUID', userIdOrEmail, error);
      return null;
    }

    const maybeId = profileByEmail?.id as unknown as string | undefined;
    if (maybeId && uuidRegex.test(maybeId)) return maybeId;

    console.warn('useCreateNotification: resolved profile.id is not a UUID', maybeId);
    return null;
  }

  console.warn('useCreateNotification: user_id is neither UUID nor email', userIdOrEmail);
  return null;
}

export function useCreateNotification() {
  const createNotification = async (params: CreateNotificationParams) => {
    try {
      const targetUserId = await resolveUserUuid(params.user_id);
      if (!targetUserId) {
        throw new Error('useCreateNotification: could not resolve target user UUID');
      }

      const notificationsResult = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: params.notification_type,
          title: params.title,
          message: params.body,
          data: params.data || null,
          is_read: false,
        })
        .select()
        .single();


      // also insert into push_notifications for dashboard/real-time
      const pushUserId = targetUserId;
      const allowed = ['new_post','new_poll','new_campaign','campaign_update','general'];
      const pushType = allowed.includes(params.notification_type) ? params.notification_type : 'general';
      const pushResult = await supabase
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


      if (notificationsResult.error) throw notificationsResult.error;
      if (pushResult.error) console.error('push notification creation error', pushResult.error);

      return { success: true, data: notificationsResult.data };
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
      const uuids = user_ids.filter((u) => uuidRegex.test(u));
      const emails = user_ids.filter((u) => u.includes('@'));

      const emailToUuid = new Map<string, string>();
      if (emails.length) {
        const { data: profilesByEmail, error } = await supabase
          .from('profiles')
          .select('id,email')
          .in('email', emails);
        if (error) {
          console.warn('createBulkNotifications: unable to resolve emails to UUIDs', error);
        } else {
          (profilesByEmail || []).forEach((p: any) => {
            if (p?.email && p?.id && uuidRegex.test(p.id)) {
              emailToUuid.set(p.email, p.id);
            }
          });
        }
      }

      const resolvedUserUuids = [
        ...uuids,
        ...emails.map((e) => emailToUuid.get(e)).filter((x): x is string => Boolean(x)),
      ];

      const notifications = resolvedUserUuids.map((user_id) => ({
        user_id,
        type: notification.notification_type,
        title: notification.title,
        message: notification.body,
        data: notification.data || null,
        is_read: false,
        created_at: now,
      }));

      const allowed = ['new_post','new_poll','new_campaign','campaign_update','general'];
      const pushType = allowed.includes(notification.notification_type) ? notification.notification_type : 'general';
      const pushNotifications = resolvedUserUuids.map((user_id) => ({
        user_id,
        notification_type: pushType,
        title: notification.title,
        body: notification.body,
        data: notification.data || null,
        related_id: null,
        is_read: false,
        created_at: now,
      }));

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
