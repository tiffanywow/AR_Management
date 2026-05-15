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
 * Implements selective notification routing based on event type and user role.
 */
export async function sendRoleNotification({
    roles,
    type,
    title,
    message,
    data = {},
}: CreateRoleNotificationParams): Promise<void> {
    try {
        // Define notification routing rules based on event type and roles
        const notificationRules: Record<string, string[]> = {
            // Financial events - only finance, administrator, super_admin
            'donation_received': ['finance', 'administrator', 'super_admin'],
            'donation_made': ['finance', 'administrator', 'super_admin'],
            'order_placed': ['finance', 'administrator', 'super_admin'],
            'payment_received': ['finance', 'administrator', 'super_admin'],
            'payment_failed': ['finance', 'administrator', 'super_admin'],
            'expense_report_submitted': ['finance', 'administrator', 'super_admin'],
            
            // Member management events - only administrator, super_admin
            'membership_request': ['administrator', 'super_admin'],
            'membership_approved': ['administrator', 'super_admin'],
            'membership_rejected': ['administrator', 'super_admin'],
            'user_deactivated': ['administrator', 'super_admin'],
            
            // Content & engagement - admin, super_admin, communications_officer
            'community_created': ['administrator', 'super_admin', 'communications_officer'],
            'community_deleted': ['administrator', 'super_admin', 'communications_officer'],
            'poll_created': ['administrator', 'super_admin', 'communications_officer'],
            'advert_created': ['administrator', 'super_admin', 'communications_officer'],
            'advert_status_changed': ['administrator', 'super_admin', 'communications_officer'],
            'broadcast_published': ['administrator', 'super_admin', 'communications_officer'],
        };

        // Determine which roles should receive this notification
        const targetRoles = notificationRules[type] || roles;
        
        // 1. Fetch all active users matching the target roles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id,email')
            .in('role', targetRoles)
            .eq('is_active', true);

        if (profilesError) {
            console.error('Error fetching profiles for notification:', profilesError);
            return;
        }

        if (!profiles || profiles.length === 0) {
            console.debug(`No users found for notification type: ${type}, target roles: ${targetRoles.join(', ')}`);
            return;
        }

        // 2. Prepare bulk insert payload for notifications table (uuid user_id)
        const now = new Date().toISOString();
        const notificationsToInsert = profiles.map((profile) => ({
            user_id: profile.id,
            type: type,
            title,
            message: message,
            data: { ...data, target_roles: targetRoles },
            is_read: false,
            created_at: now,
        }));

        // 3. Prepare payload for push_notifications (dashboard/mobile)
        // Map custom notification types to allowed push types
        const allowedPushTypes = ['new_post','new_poll','new_campaign','campaign_update','general'];
        const pushType = allowedPushTypes.includes(type) ? type : 'general';
        const pushPayload = profiles.map((profile) => ({
            user_id: profile.id,
            notification_type: pushType,
            title,
            body: message,
            data: { ...data, original_type: type, target_roles: targetRoles },
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
