import { supabase } from './supabase';

/**
 * Utility functions for managing notifications
 */

export async function createTestNotification(userId: string) {
  try {
    const { data, error } = await supabase
      .from('push_notifications')
      .insert({
        user_id: userId,
        notification_type: 'info',
        title: 'Test Notification',
        body: 'This is a test notification to verify notifications are working correctly.',
        data: { test: true },
      })
      .select();

    if (error) {
      console.error('Error creating test notification:', error);
      return { success: false, error: error.message };
    }

    console.log('Test notification created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error creating test notification:', error);
    return { success: false, error: String(error) };
  }
}

export async function getNotificationStats() {
  try {
    // Get total notifications
    const { count: totalCount } = await supabase
      .from('push_notifications')
      .select('*', { count: 'exact', head: true });

    // Get current user notifications
    const { data: userSession } = await supabase.auth.getSession();
    if (!userSession?.session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = userSession.session.user.id;

    const { count: userCount } = await supabase
      .from('push_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: unreadCount } = await supabase
      .from('push_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      success: true,
      stats: {
        totalNotifications: totalCount || 0,
        userNotifications: userCount || 0,
        unreadNotifications: unreadCount || 0,
        userId,
      },
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    return { success: false, error: String(error) };
  }
}

export async function debugNotifications() {
  try {
    const { data: userSession } = await supabase.auth.getSession();
    if (!userSession?.session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = userSession.session.user.id;
    const userEmail = userSession.session.user.email;

    console.log('=== Notification Debug Info ===');
    console.log('User ID:', userId);
    console.log('User Email:', userEmail);

    // Check if user has profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('User Profile:', profile);

    // Get notifications
    const { data: notifications, error } = await supabase
      .from('push_notifications')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching notifications:', error);
    }

    console.log('User Notifications:', notifications);
    console.log('Total count:', notifications?.length || 0);

    return {
      success: true,
      debug: {
        userId,
        userEmail,
        profile,
        notifications,
        notificationCount: notifications?.length || 0,
      },
    };
  } catch (error) {
    console.error('Error debugging notifications:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendBroadcastNotifications(broadcastId: string, title: string, body: string) {
  try {
    // Get all active members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return { success: false, error: membersError.message };
    }

    if (!members || members.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    // Create notifications for all members
    const memberIds = members.map((m) => m.id);
    const notifications = memberIds.map((memberId) => ({
      user_id: memberId,
      notification_type: 'broadcast',
      title,
      body,
      related_id: broadcastId,
      is_read: false,
      sent_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('push_notifications')
      .insert(notifications) as any;

    if (error) {
      console.error('Error creating broadcast notifications:', error);
      return { success: false, error: error.message };
    }

    const count = (data as any[]) ? (data as any[]).length : 0;
    console.log(`Created ${count} notifications for broadcast`);
    return { success: true, notificationsSent: count };
  } catch (error) {
    console.error('Error sending broadcast notifications:', error);
    return { success: false, error: String(error) };
  }
}
