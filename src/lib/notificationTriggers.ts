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
        // 1. Fetch all active users matching the specified roles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .in('role', roles)
            .eq('is_active', true);

        if (profilesError) {
            console.error('Error fetching profiles for notification:', profilesError);
            return;
        }

        if (!profiles || profiles.length === 0) {
            return; // No users to notify
        }

        // 2. Prepare bulk insert payload
        const now = new Date().toISOString();
        const notificationsToInsert = profiles.map((profile) => ({
            user_id: profile.id, // Auth user UUID
            type: type,
            title,
            message: message, // changed from 'body'
            data,
            is_read: false,
            created_at: now,
        }));

        // 4. Bulk insert notifications
        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notificationsToInsert);

        if (insertError) {
            console.error('Error sending role-based bulk notifications:', insertError);
        }
    } catch (error) {
        console.error('Unexpected error in sendRoleNotification:', error);
    }
}
