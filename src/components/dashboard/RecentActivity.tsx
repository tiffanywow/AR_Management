import { useState, useEffect } from 'react';
import { Clock, User, MessageSquare, Target, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'member' | 'broadcast' | 'campaign' | 'community';
  message: string;
  time: string;
  icon: any;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const recentActivities: Activity[] = [];

      const [membersResult, broadcastsResult, campaignsResult] = await Promise.all([
        supabase
          .from('memberships')
          .select('id, created_at, full_name')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('broadcasts')
          .select('id, published_at, content')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3),
        supabase
          .from('campaigns')
          .select('id, name, raised_amount, target_amount, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(2),
      ]);

      if (membersResult.data) {
        membersResult.data.forEach((member: any) => {
          recentActivities.push({
            id: member.id,
            type: 'member',
            message: `${member.full_name || 'New member'} joined`,
            time: formatDistanceToNow(new Date(member.created_at), { addSuffix: true }),
            icon: User,
          });
        });
      }

      if (broadcastsResult.data) {
        broadcastsResult.data.forEach((broadcast: any) => {
          const preview = broadcast.content.substring(0, 50) + (broadcast.content.length > 50 ? '...' : '');
          recentActivities.push({
            id: broadcast.id,
            type: 'broadcast',
            message: `Broadcast sent: "${preview}"`,
            time: formatDistanceToNow(new Date(broadcast.published_at), { addSuffix: true }),
            icon: MessageSquare,
          });
        });
      }

      if (campaignsResult.data) {
        campaignsResult.data.forEach((campaign: any) => {
          const percentage = campaign.target_amount > 0
            ? Math.round((campaign.raised_amount / campaign.target_amount) * 100)
            : 0;
          recentActivities.push({
            id: campaign.id,
            type: 'campaign',
            message: `${campaign.name} campaign at ${percentage}% funding`,
            time: formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true }),
            icon: Target,
          });
        });
      }

      recentActivities.sort((a, b) => {
        const timeA = a.time.includes('second') ? 0 : a.time.includes('minute') ? 1 : a.time.includes('hour') ? 2 : 3;
        const timeB = b.time.includes('second') ? 0 : b.time.includes('minute') ? 1 : b.time.includes('hour') ? 2 : 3;
        return timeA - timeB;
      });

      setActivities(recentActivities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#d1242a] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-gray-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activity.icon;
        return (
          <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 bg-[#d1242a]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-[#d1242a]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{activity.message}</p>
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" strokeWidth={1.5} />
                {activity.time}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
