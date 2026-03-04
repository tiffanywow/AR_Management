import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, DollarSign, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendRoleNotification } from '@/lib/notificationTriggers';

interface Revenue {
  id: string;
  source: string;
  description: string;
  amount: number;
  revenue_date: string;
  reference_number: string | null;
  created_at: string;
}

export default function RevenueManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    donations: 0,
    membershipFees: 0,
    otherRevenue: 0,
  });

  const [formData, setFormData] = useState({
    source: 'donations',
    description: '',
    amount: '',
    revenue_date: new Date().toISOString().split('T')[0],
    reference_number: '',
  });

  useEffect(() => {
    fetchRevenues();
  }, []);

  const fetchRevenues = async () => {
    try {
      const { data, error } = await supabase
        .from('party_revenue')
        .select('*')
        .order('revenue_date', { ascending: false });

      if (error) throw error;

      setRevenues(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching revenues:', error);
    }
  };

  const calculateStats = (data: Revenue[]) => {
    const totalRevenue = data.reduce((sum, r) => sum + Number(r.amount), 0);
    const donations = data.filter(r => r.source === 'donations').reduce((sum, r) => sum + Number(r.amount), 0);
    const membershipFees = data.filter(r => r.source === 'membership_fees').reduce((sum, r) => sum + Number(r.amount), 0);
    const otherRevenue = data.filter(r => !['donations', 'membership_fees'].includes(r.source)).reduce((sum, r) => sum + Number(r.amount), 0);

    setStats({ totalRevenue, donations, membershipFees, otherRevenue });
  };

  const handleAddRevenue = async () => {
    if (!user || !formData.description || !formData.amount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('party_revenue').insert([
        {
          source: formData.source,
          description: formData.description,
          amount: parseFloat(formData.amount),
          revenue_date: formData.revenue_date,
          reference_number: formData.reference_number || null,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      await sendRoleNotification({
        roles: ['super_admin', 'finance'],
        type: 'revenue_added',
        title: 'New Revenue Recorded',
        message: `N$${parseFloat(formData.amount).toLocaleString()} added from ${getSourceLabel(formData.source)}.`,
      });

      toast({
        title: 'Revenue Added',
        description: 'Revenue record has been added successfully',
      });

      setDialogOpen(false);
      setFormData({
        source: 'donations',
        description: '',
        amount: '',
        revenue_date: new Date().toISOString().split('T')[0],
        reference_number: '',
      });

      fetchRevenues();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add revenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSourceLabel = (source: string) => {
    return source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'donations':
        return 'bg-green-100 text-green-800';
      case 'membership_fees':
        return 'bg-blue-100 text-blue-800';
      case 'merchandise':
        return 'bg-purple-100 text-purple-800';
      case 'events':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Revenue Management</h1>
          <p className="text-gray-600 font-light">Track and manage party revenue streams</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/finance')}>
            Back to Finance
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
                <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Add Revenue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Revenue Record</DialogTitle>
                <DialogDescription>Record a new source of revenue for the party</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Revenue Source</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="donations">Donations</SelectItem>
                      <SelectItem value="membership_fees">Membership Fees</SelectItem>
                      <SelectItem value="merchandise">Merchandise Sales</SelectItem>
                      <SelectItem value="events">Event Revenue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Enter revenue description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount (N$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.revenue_date}
                    onChange={(e) => setFormData({ ...formData, revenue_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reference Number (Optional)</Label>
                  <Input
                    placeholder="e.g., INV-2024-001"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                  onClick={handleAddRevenue}
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Revenue'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Donations</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.donations.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Membership Fees</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.membershipFees.toLocaleString()}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Other Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.otherRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Revenue Records</CardTitle>
          <CardDescription>All recorded revenue transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {revenues.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-gray-600">No revenue records yet</p>
              <p className="text-sm text-gray-500 mt-1">Add your first revenue record to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {revenues.map((revenue) => (
                <div
                  key={revenue.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{revenue.description}</p>
                        <Badge className={getSourceColor(revenue.source)}>
                          {getSourceLabel(revenue.source)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          {new Date(revenue.revenue_date).toLocaleDateString()}
                        </div>
                        {revenue.reference_number && (
                          <span>Ref: {revenue.reference_number}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-green-600">
                      +N${Number(revenue.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
