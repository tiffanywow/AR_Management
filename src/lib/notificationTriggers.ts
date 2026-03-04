import { supabase, UserRole } from './supabase';

export interface CreateRoleNotificationParams {
    roles: UserRole[];
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
}

/**
 * Sends a notification to all active users who have one of the specified roles.
 */
export async function sendRoleNotification({
    roles,
    type,
    title,
    message,
    data = {},
}: CreateRoleNotificationParams): Promise<void> {
    try {
        // 1. Fetch all active users matching the specified roles (need email for legacy table)
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id,email')
            .in('role', roles)
            .eq('is_active', true);

        if (profilesError) {
            console.error('Error fetching profiles for notification:', profilesError);
            return;
        }

        if (!profiles || profiles.length === 0) {
            return; // No users to notify
        }

        // 2. Prepare bulk insert payload for notifications table (uuid user_id)
        const now = new Date().toISOString();
        const notificationsToInsert = profiles.map((profile) => ({
            user_id: profile.id,
            type: type,
            title,
            message: message, // changed from 'body'
            data,
            is_read: false,
            created_at: now,
        }));

        // 3. Prepare payload for push_notifications (dashboard/mobile)
        // some custom types may be rejected by check constraint; use 'general' for unknown types
        const allowedPushTypes = ['new_post','new_poll','new_campaign','campaign_update','general'];
        const pushType = allowedPushTypes.includes(type) ? type : 'general';
        const pushPayload = profiles.map((profile) => ({
            user_id: profile.id,
            notification_type: pushType,
            title,
            body: message,
            data: { ...data, original_type: type },
            related_id: null,
            is_read: false,
            created_at: now,
        }));

        // 4. Bulk insert notifications into both tables
        const [{ error: insertError }, { error: pushError }] = await Promise.all([
            supabase.from('notifications').insert(notificationsToInsert),
            supabase.from('push_notifications').insert(pushPayload),
        ]);

        if (insertError) {
            console.error('Error sending role-based bulk notifications (legacy):', insertError);
        }
        if (pushError) {
            console.error('Error sending role-based bulk push notifications:', pushError);
        }
    } catch (error) {
        console.error('Unexpected error in sendRoleNotification:', error);
    }
}
