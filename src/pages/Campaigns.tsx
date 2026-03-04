import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, DollarSign, Users, Calendar, TrendingUp, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendRoleNotification } from '@/lib/notificationTriggers';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_date: string | null;
  end_date: string | null;
  target_amount: number;
  raised_amount: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  gallery_images: string[] | null;
}

export default function Campaigns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };


  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      await sendRoleNotification({
        roles: ['super_admin', 'administrator', 'communications_officer'],
        type: 'campaign_deleted',
        title: 'Campaign Deleted',
        message: 'A campaign has been deleted.',
      });

      toast({
        title: 'Campaign Deleted',
        description: 'The campaign has been removed',
      });

      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete campaign',
        variant: 'destructive',
      });
    }
  };

  const totalTarget = campaigns.reduce((sum, campaign) => sum + (campaign.target_amount || 0), 0);
  const totalRaised = campaigns.reduce((sum, campaign) => sum + (campaign.raised_amount || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (raised: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.min(Math.round((raised / target) * 100), 100);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 font-light">Manage your political campaigns and fundraising</p>
        </div>
        <Button
          className="bg-[#d1242a] hover:bg-[#b91c1c]"
          onClick={() => navigate('/campaigns/create')}
        >
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Target</p>
                <p className="text-2xl font-semibold text-gray-900">N${(totalTarget / 1000).toFixed(0)}k</p>
              </div>
              <Target className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Raised</p>
                <p className="text-2xl font-semibold text-gray-900">N${(totalRaised / 1000).toFixed(0)}k</p>
                {totalTarget > 0 && (
                  <p className="text-sm text-green-600 font-light">{((totalRaised / totalTarget) * 100).toFixed(1)}% of target</p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-semibold text-gray-900">{activeCampaigns}</p>
                <p className="text-sm text-gray-600 font-light">of {campaigns.length} total</p>
              </div>
              <Users className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-gray-600">No campaigns yet</p>
            <p className="text-sm text-gray-500 mt-1 font-light">Create your first campaign to start mobilizing</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {campaigns.map((campaign) => {
            const progress = calculateProgress(campaign.raised_amount, campaign.target_amount);
            return (
              <Card key={campaign.id} className="overflow-hidden">
                {campaign.image_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img
                      src={campaign.image_url}
                      alt={campaign.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium">{campaign.name}</CardTitle>
                      <CardDescription className="mt-1">{campaign.description || 'No description'}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="bg-gray-100 hover:bg-gray-200 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">N${campaign.raised_amount.toLocaleString()} / N${campaign.target_amount.toLocaleString()}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{progress}% complete</span>
                      <span>N${(campaign.target_amount - campaign.raised_amount).toLocaleString()} remaining</span>
                    </div>
                  </div>

                  {(campaign.end_date || campaign.location_name) && (
                    <div className="flex justify-between items-center text-sm">
                      {campaign.end_date && (
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          Due {new Date(campaign.end_date).toLocaleDateString()}
                        </div>
                      )}
                      {campaign.location_name && (
                        <div className="flex items-center text-gray-600">
                          <Target className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          {campaign.location_name}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-[#d1242a] hover:bg-[#b91c1c]"
                      onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
