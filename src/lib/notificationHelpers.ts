import { supabase } from './supabase';

export interface NotificationParams {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  related_id?: string;
}

export const notificationHelpers = {
  async notifyPaymentReceived(userId: string, amount: number, paymentId: string, reference?: string) {
    return await supabase.from('push_notifications').insert({
      user_id: userId,
      notification_type: 'payment_received',
      title: 'Payment Received',
      body: `Your payment of N$${amount.toFixed(2)} has been confirmed.`,
      data: { amount, reference },
      related_id: paymentId,
      is_read: false,
      sent_at: new Date().toISOString(),
    });
  },

  async notifyDonationReceived(adminIds: string[], amount: number, donorName: string, donationId: string) {
    const notifications = adminIds.map(user_id => ({
      user_id,
      notification_type: 'donation_received',
      title: 'New Donation Received',
      body: `${donorName} donated N$${amount.toFixed(2)}`,
      data: { amount, donor_name: donorName },
      related_id: donationId,
      is_read: false,
      sent_at: new Date().toISOString(),
    }));

    return await supabase.from('push_notifications').insert(notifications);
  },

  async notifyOrderPlaced(adminIds: string[], orderNumber: string, totalAmount: number, orderId: string) {
    const notifications = adminIds.map(user_id => ({
      user_id,
      notification_type: 'order_placed',
      title: 'New Store Order',
      body: `Order #${orderNumber} placed for N$${totalAmount.toFixed(2)}`,
      data: { order_number: orderNumber, total_amount: totalAmount },
      related_id: orderId,
      is_read: false,
      sent_at: new Date().toISOString(),
    }));

    return await supabase.from('push_notifications').insert(notifications);
  },

  async notifyBroadcastLike(authorId: string, likerName: string, broadcastId: string) {
    return await supabase.from('push_notifications').insert({
      user_id: authorId,
      notification_type: 'broadcast_like',
      title: 'New Like on Your Post',
      body: `${likerName} liked your post`,
      data: { liker_name: likerName },
      related_id: broadcastId,
      is_read: false,
      sent_at: new Date().toISOString(),
    });
  },

  async notifyBroadcastComment(authorId: string, commenterName: string, commentPreview: string, broadcastId: string) {
    return await supabase.from('push_notifications').insert({
      user_id: authorId,
      notification_type: 'broadcast_comment',
      title: 'New Comment on Your Post',
      body: `${commenterName} commented: ${commentPreview}`,
      data: { commenter_name: commenterName, comment_preview: commentPreview },
      related_id: broadcastId,
      is_read: false,
      sent_at: new Date().toISOString(),
    });
  },

  async notifyCampaignUpdate(memberIds: string[], campaignName: string, updateMessage: string, campaignId: string) {
    const notifications = memberIds.map(user_id => ({
      user_id,
      notification_type: 'campaign_update',
      title: `Campaign Update: ${campaignName}`,
      body: updateMessage,
      related_id: campaignId,
      is_read: false,
      sent_at: new Date().toISOString(),
    }));

    return await supabase.from('push_notifications').insert(notifications);
  },

  async notifyMembershipApproved(userId: string, membershipNumber: string, membershipId: string) {
    return await supabase.from('push_notifications').insert({
      user_id: userId,
      notification_type: 'membership_approved',
      title: 'Membership Approved!',
      body: `Welcome to the party! Your membership number is ${membershipNumber}.`,
      data: { membership_number: membershipNumber },
      related_id: membershipId,
      is_read: false,
      sent_at: new Date().toISOString(),
    });
  },

  async notifyMembershipRejected(userId: string, reason: string, membershipId: string) {
    return await supabase.from('push_notifications').insert({
      user_id: userId,
      notification_type: 'membership_rejected',
      title: 'Membership Application',
      body: `Your application has been reviewed. ${reason}`,
      data: { reason },
      related_id: membershipId,
      is_read: false,
      sent_at: new Date().toISOString(),
    });
  },

  async notifyApprovalRequired(adminIds: string[], title: string, body: string, relatedId?: string) {
    const notifications = adminIds.map(user_id => ({
      user_id,
      notification_type: 'approval_required',
      title,
      body,
      related_id: relatedId,
      is_read: false,
      sent_at: new Date().toISOString(),
    }));

    return await supabase.from('push_notifications').insert(notifications);
  },

  async notifyGeneral(userIds: string[], title: string, body: string, type: string = 'info', relatedId?: string) {
    const notifications = userIds.map(user_id => ({
      user_id,
      notification_type: type,
      title,
      body,
      related_id: relatedId,
      is_read: false,
      sent_at: new Date().toISOString(),
    }));

    return await supabase.from('push_notifications').insert(notifications);
  },

  async getAdminUserIds() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['super_admin', 'administrator', 'finance'])
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching admin user IDs:', error);
      return [];
    }

    return data?.map(profile => profile.id) || [];
  },

  async getAdminsAndFinance() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['super_admin', 'administrator', 'finance'])
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching admin/finance user IDs:', error);
      return [];
    }

    return data?.map(profile => profile.id) || [];
  },
};
