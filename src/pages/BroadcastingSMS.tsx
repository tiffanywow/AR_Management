import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, Users, Calendar, Clock, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Region {
  id: string;
  name: string;
}

interface Member {
  id: string;
  full_name: string;
  surname: string;
  phone_number: string;
  email: string;
  region: string;
}

interface SMSCampaign {
  id: string;
  title: string;
  message: string;
  filter_type: string;
  filter_value: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
}

export default function BroadcastingSMS() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    filter_type: 'all',
    filter_value: '',
    scheduled_for: '',
  });

  useEffect(() => {
    fetchRegions();
    fetchCampaigns();
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchRecipientCount();
  }, [formData.filter_type, formData.filter_value]);

  useEffect(() => {
    if (memberSearch.trim()) {
      const filtered = members.filter(m =>
        m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.surname.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.phone_number.includes(memberSearch)
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers([]);
    }
  }, [memberSearch, members]);

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, full_name, surname, phone_number, email, region')
        .eq('status', 'approved')
        .order('full_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchRecipientCount = async () => {
    try {
      if (formData.filter_type === 'individual') {
        setRecipientCount(formData.filter_value ? 1 : 0);
        return;
      }

      let query = supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true });

      if (formData.filter_type === 'region' && formData.filter_value) {
        query = query.eq('region', formData.filter_value);
      } else if (formData.filter_type === 'membership_status' && formData.filter_value) {
        query = query.eq('status', formData.filter_value);
      }

      const { count, error } = await query;

      if (error) throw error;
      setRecipientCount(count || 0);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
      setRecipientCount(0);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !formData.title || !formData.message) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and message',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('sms_campaigns').insert([
        {
          title: formData.title,
          message: formData.message,
          filter_type: formData.filter_type,
          filter_value: formData.filter_value || null,
          status: 'draft',
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Draft Saved',
        description: 'Your SMS campaign has been saved as a draft',
      });

      setFormData({
        title: '',
        message: '',
        filter_type: 'all',
        filter_value: '',
        scheduled_for: '',
      });

      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCampaign = async () => {
    if (!user || !formData.title || !formData.message || !formData.scheduled_for) {
      toast({
        title: 'Missing Information',
        description: 'Please provide all required fields including schedule time',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.from('sms_campaigns').insert([
        {
          title: formData.title,
          message: formData.message,
          filter_type: formData.filter_type,
          filter_value: formData.filter_value || null,
          status: 'scheduled',
          scheduled_for: formData.scheduled_for,
          created_by: user.id,
        },
      ]).select().single();

      if (error) throw error;

      const scheduledDate = new Date(formData.scheduled_for);
      await supabase.from('calendar_events').insert([
        {
          title: `SMS Campaign: ${formData.title}`,
          description: `Scheduled SMS campaign to ${recipientCount} recipients`,
          event_date: scheduledDate.toISOString().split('T')[0],
          event_time: scheduledDate.toTimeString().split(' ')[0],
          location: 'SMS Broadcasting',
          created_by: user.id,
        },
      ]);

      toast({
        title: 'Campaign Scheduled',
        description: `SMS campaign scheduled for ${new Date(formData.scheduled_for).toLocaleString()}`,
      });

      setScheduleDialogOpen(false);
      setFormData({
        title: '',
        message: '',
        filter_type: 'all',
        filter_value: '',
        scheduled_for: '',
      });

      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!user || !formData.title || !formData.message) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and message',
        variant: 'destructive',
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: 'No Recipients',
        description: 'No members match your filter criteria',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: campaign, error: insertError } = await supabase
        .from('sms_campaigns')
        .insert([
          {
            title: formData.title,
            message: formData.message,
            filter_type: formData.filter_type,
            filter_value: formData.filter_value || null,
            status: 'sending',
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-campaign`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          testMode: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send SMS campaign');
      }

      toast({
        title: 'Campaign Sent',
        description: `SMS sent to ${result.successCount} of ${result.totalRecipients} recipients`,
      });

      setFormData({
        title: '',
        message: '',
        filter_type: 'all',
        filter_value: '',
        scheduled_for: '',
      });

      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send SMS campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" strokeWidth={1.5} />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" strokeWidth={1.5} />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" strokeWidth={1.5} />;
      case 'sending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" strokeWidth={1.5} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status as keyof typeof colors] || colors.draft}>{status}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">SMS Campaigns</h1>
          <p className="text-gray-600 font-light">Create and manage SMS campaigns for your members</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/broadcasting-enhanced')}>
          Back to Broadcasting
        </Button>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Compose SMS Campaign</CardTitle>
                  <CardDescription>Create a new SMS campaign to send to your members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Campaign Title</Label>
                    <Input
                      placeholder="Enter campaign title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Type your SMS message here..."
                      className="min-h-32"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {formData.message.length <= 160
                          ? 'SMS limit: 160 characters per message'
                          : `This will be sent as ${Math.ceil(formData.message.length / 160)} SMS messages`}
                      </span>
                      <span className={formData.message.length > 160 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                        {formData.message.length} characters
                        {formData.message.length > 160 && ` (+${formData.message.length - 160} over)`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Filter By</Label>
                      <Select
                        value={formData.filter_type}
                        onValueChange={(value) => setFormData({ ...formData, filter_type: value, filter_value: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Members</SelectItem>
                          <SelectItem value="individual">Individual Member</SelectItem>
                          <SelectItem value="region">By Region</SelectItem>
                          <SelectItem value="membership_status">By Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.filter_type === 'individual' && (
                      <div className="space-y-2">
                        <Label>Search Member</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
                          <Input
                            placeholder="Search by name or phone"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {filteredMembers.length > 0 && (
                          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                            {filteredMembers.map((member) => (
                              <div
                                key={member.id}
                                className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                                  formData.filter_value === member.id ? 'bg-red-50' : ''
                                }`}
                                onClick={() => {
                                  setFormData({ ...formData, filter_value: member.id });
                                  setMemberSearch(`${member.full_name} ${member.surname}`);
                                  setFilteredMembers([]);
                                }}
                              >
                                <p className="text-sm font-medium text-gray-900">
                                  {member.full_name} {member.surname}
                                </p>
                                <p className="text-xs text-gray-500">{member.phone_number}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {formData.filter_type === 'region' && (
                      <div className="space-y-2">
                        <Label>Select Region</Label>
                        <Select
                          value={formData.filter_value}
                          onValueChange={(value) => setFormData({ ...formData, filter_value: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose region" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((region) => (
                              <SelectItem key={region.id} value={region.name}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.filter_type === 'membership_status' && (
                      <div className="space-y-2">
                        <Label>Select Status</Label>
                        <Select
                          value={formData.filter_value}
                          onValueChange={(value) => setFormData({ ...formData, filter_value: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Estimated recipients: <span className="font-medium">{recipientCount}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleSaveDraft} disabled={loading}>
                        Save Draft
                      </Button>
                      <Button variant="outline" onClick={() => setScheduleDialogOpen(true)} disabled={loading}>
                        <Clock className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Schedule
                      </Button>
                      <Button
                        className="bg-[#d1242a] hover:bg-[#b91c1c]"
                        onClick={handleSendNow}
                        disabled={loading}
                      >
                        <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        {loading ? 'Sending...' : 'Send Now'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Campaign Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                      <span className="text-sm">Total Campaigns</span>
                    </div>
                    <span className="font-medium">{campaigns.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                      <span className="text-sm">Sent</span>
                    </div>
                    <span className="font-medium">{campaigns.filter((c) => c.status === 'sent').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                      <span className="text-sm">Scheduled</span>
                    </div>
                    <span className="font-medium">{campaigns.filter((c) => c.status === 'scheduled').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                      <span className="text-sm">Total Recipients</span>
                    </div>
                    <span className="font-medium">
                      {campaigns.reduce((sum, c) => sum + c.recipient_count, 0).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Campaign History</CardTitle>
              <CardDescription>View all your SMS campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-gray-600">No campaigns yet</p>
                    <p className="text-sm text-gray-500 mt-1">Create your first SMS campaign to get started</p>
                  </div>
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                          {getStatusIcon(campaign.status)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{campaign.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{campaign.message}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            {campaign.sent_at && (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" strokeWidth={1.5} />
                                {new Date(campaign.sent_at).toLocaleString()}
                              </div>
                            )}
                            {campaign.scheduled_for && !campaign.sent_at && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" strokeWidth={1.5} />
                                Scheduled: {new Date(campaign.scheduled_for).toLocaleString()}
                              </div>
                            )}
                            {campaign.recipient_count > 0 && (
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1" strokeWidth={1.5} />
                                {campaign.recipient_count} recipients
                                {campaign.status === 'sent' &&
                                  ` (${campaign.success_count} sent, ${campaign.failed_count} failed)`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule SMS Campaign</DialogTitle>
            <DialogDescription>Choose when to send this campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Schedule Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600">This campaign will be added to your calendar</p>
              <p className="text-xs text-gray-500 mt-1">
                Recipients: {recipientCount} | Message: {formData.message.length} characters
                {formData.message.length > 160 && ` (${Math.ceil(formData.message.length / 160)} SMS)`}
              </p>
            </div>
            <Button
              className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
              onClick={handleScheduleCampaign}
              disabled={loading}
            >
              {loading ? 'Scheduling...' : 'Schedule Campaign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
