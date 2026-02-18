import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, MessageSquare, DollarSign } from 'lucide-react';
import NamibiaMap from '@/components/dashboard/NamibiaMap';
import MembershipChart from '@/components/dashboard/MembershipChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalMembers: number;
  newRegistrations: number;
  messagesSent: number;
  campaignFunds: number;
  memberGrowth: number;
  registrationGrowth: number;
  messageGrowth: number;
  fundingGrowth: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    newRegistrations: 0,
    messagesSent: 0,
    campaignFunds: 0,
    memberGrowth: 0,
    registrationGrowth: 0,
    messageGrowth: 0,
    fundingGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [membersResult, newMembersResult, lastMonthMembersResult, broadcastsResult, lastMonthBroadcastsResult, campaignsResult] = await Promise.all([
        supabase.from('memberships').select('id', { count: 'exact', head: true }),
        supabase.from('memberships').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
        supabase.from('memberships').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lt('created_at', lastMonthEnd),
        supabase.from('broadcasts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('broadcasts').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', lastMonthStart).lt('published_at', lastMonthEnd),
        supabase.from('campaigns').select('raised_amount').eq('status', 'active'),
      ]);

      const totalMembers = membersResult.count || 0;
      const newRegistrations = newMembersResult.count || 0;
      const lastMonthMembers = lastMonthMembersResult.count || 0;
      const messagesSent = broadcastsResult.count || 0;
      const lastMonthMessages = lastMonthBroadcastsResult.count || 0;

      const campaignFunds = (campaignsResult.data || []).reduce((sum, campaign) => sum + (campaign.raised_amount || 0), 0);

      const memberGrowth = lastMonthMembers > 0 ? ((newRegistrations - lastMonthMembers) / lastMonthMembers) * 100 : 0;
      const registrationGrowth = lastMonthMembers > 0 ? ((newRegistrations / lastMonthMembers - 1) * 100) : 0;
      const messageGrowth = lastMonthMessages > 0 ? (((messagesSent - lastMonthMessages) / lastMonthMessages) * 100) : 0;

      setStats({
        totalMembers,
        newRegistrations,
        messagesSent,
        campaignFunds,
        memberGrowth,
        registrationGrowth,
        messageGrowth,
        fundingGrowth: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsDisplay = [
    {
      name: 'Total Members',
      value: loading ? '...' : stats.totalMembers.toLocaleString(),
      change: loading ? '...' : `${stats.memberGrowth >= 0 ? '+' : ''}${stats.memberGrowth.toFixed(1)}%`,
      changeType: stats.memberGrowth >= 0 ? 'positive' : 'negative',
      icon: Users,
    },
    {
      name: 'New Registrations',
      value: loading ? '...' : stats.newRegistrations.toLocaleString(),
      change: loading ? '...' : `${stats.registrationGrowth >= 0 ? '+' : ''}${stats.registrationGrowth.toFixed(1)}%`,
      changeType: stats.registrationGrowth >= 0 ? 'positive' : 'negative',
      icon: TrendingUp,
    },
    {
      name: 'Broadcasts Sent',
      value: loading ? '...' : stats.messagesSent.toLocaleString(),
      change: loading ? '...' : `${stats.messageGrowth >= 0 ? '+' : ''}${stats.messageGrowth.toFixed(1)}%`,
      changeType: stats.messageGrowth >= 0 ? 'positive' : 'negative',
      icon: MessageSquare,
    },
    {
      name: 'Campaign Funds',
      value: loading ? '...' : `N$${(stats.campaignFunds / 1000000).toFixed(1)}M`,
      change: loading ? '...' : `${stats.fundingGrowth >= 0 ? '+' : ''}${stats.fundingGrowth.toFixed(1)}%`,
      changeType: stats.fundingGrowth >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {profile?.full_name || 'User'}
        </h1>
        <p className="text-gray-600 font-light">Here's what's happening with AR today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsDisplay.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.changeType === 'positive';
          return (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <p className={`text-sm font-light ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change} from last month
                    </p>
                  </div>
                  <Icon className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Member Distribution</CardTitle>
            <CardDescription>Members by region across Namibia</CardDescription>
          </CardHeader>
          <CardContent>
            <NamibiaMap />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Membership Growth</CardTitle>
            <CardDescription>Monthly registration trends</CardDescription>
          </CardHeader>
          <CardContent>
            <MembershipChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your system</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
