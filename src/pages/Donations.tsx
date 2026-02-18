import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Search, ArrowLeft, Download, Upload, FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

interface Donation {
  id: string;
  campaign_id: string | null;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  payment_status: string;
  reconciled: boolean;
  reconciled_at: string | null;
  donation_date: string;
  created_at: string;
  proof_of_payment: string | null;
  campaigns?: {
    name: string;
  };
}

interface Campaign {
  id: string;
  name: string;
}

export default function Donations() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [uploadingPOP, setUploadingPOP] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');

  const canManage = hasRole('super_admin', 'finance');

  useEffect(() => {
    fetchDonations();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterDonations();
  }, [searchTerm, filterStatus, donations]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          campaigns (
            name
          )
        `)
        .order('donation_date', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDonations = () => {
    let filtered = [...donations];

    if (searchTerm) {
      filtered = filtered.filter(
        (donation) =>
          donation.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          donation.payment_reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((donation) =>
        filterStatus === 'confirmed' ? donation.payment_status === 'confirmed' : donation.payment_status === 'pending'
      );
    }

    setFilteredDonations(filtered);
  };

  const updatePaymentStatus = async (donationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('donations')
        .update({ payment_status: newStatus })
        .eq('id', donationId);

      if (error) throw error;
      toast.success('Status updated');
      await fetchDonations();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateCampaign = async (donationId: string, campaignId: string) => {
    try {
      const { error } = await supabase
        .from('donations')
        .update({ campaign_id: campaignId || null })
        .eq('id', donationId);

      if (error) throw error;
      toast.success('Campaign updated');
      await fetchDonations();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handlePOPUpload = async (donationId: string, file: File) => {
    try {
      setUploadingPOP(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${donationId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('donation-pops')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('donation-pops')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('donations')
        .update({ proof_of_payment: publicUrl })
        .eq('id', donationId);

      if (updateError) throw updateError;

      toast.success('Proof of payment uploaded');
      await fetchDonations();
      setSelectedDonation(null);
    } catch (error) {
      console.error('Error uploading POP:', error);
      toast.error('Failed to upload proof of payment');
    } finally {
      setUploadingPOP(false);
    }
  };

  const generateReport = () => {
    const reportData = filteredDonations.map((donation) => ({
      Date: new Date(donation.donation_date).toLocaleDateString(),
      'Donor Name': donation.donor_name,
      Campaign: donation.campaigns?.name || 'General',
      Amount: `N$${Number(donation.amount).toLocaleString()}`,
      'Payment Method': donation.payment_method.toUpperCase(),
      Reference: donation.payment_reference,
      Status: donation.payment_status,
    }));

    const headers = Object.keys(reportData[0] || {});
    const csvContent = [
      'Affirmative Repositioning Donations Report',
      `Generated: ${new Date().toLocaleString()}`,
      `Total: N$${filteredDonations.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()}`,
      '',
      headers.join(','),
      ...reportData.map((row) => headers.map((header) => `"${row[header as keyof typeof row]}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `AR_Donations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report downloaded');
  };

  const stats = {
    total: donations.length,
    totalAmount: donations.reduce((sum, d) => sum + Number(d.amount), 0),
    confirmed: donations.filter((d) => d.payment_status === 'confirmed').length,
    pending: donations.filter((d) => d.payment_status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/finance')}>
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Donations</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={generateReport}>
          <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
              <Gift className="h-6 w-6 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Amount</p>
                <p className="text-xl font-semibold">N${stats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Confirmed</p>
                <p className="text-xl font-semibold text-green-600">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-xl font-semibold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Donations</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('confirmed')}
              >
                Confirmed
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                Pending
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <Input
                placeholder="Search by name or reference..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredDonations.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-gray-600">No donations found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDonations.map((donation) => (
                <div key={donation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{donation.donor_name}</h3>
                        <Badge variant={donation.payment_status === 'confirmed' ? 'default' : 'secondary'} className={donation.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {donation.payment_status}
                        </Badge>
                        {donation.proof_of_payment && (
                          <Badge variant="outline" className="text-blue-600">
                            <FileText className="h-3 w-3 mr-1" strokeWidth={1.5} />
                            POP
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Amount</p>
                          <p className="font-semibold text-[#d1242a]">N${Number(donation.amount).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Method</p>
                          <p className="font-medium uppercase">{donation.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Reference</p>
                          <p className="font-medium">{donation.payment_reference}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Date</p>
                          <p className="font-medium">{new Date(donation.donation_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-600">Status:</Label>
                            <Select
                              value={donation.payment_status}
                              onValueChange={(value) => updatePaymentStatus(donation.id, value)}
                            >
                              <SelectTrigger className="h-8 w-[120px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-600">Campaign:</Label>
                            <Select
                              value={donation.campaign_id || 'none'}
                              onValueChange={(value) => updateCampaign(donation.id, value === 'none' ? '' : value)}
                            >
                              <SelectTrigger className="h-8 w-[160px] text-xs">
                                <SelectValue placeholder="Select campaign" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">General</SelectItem>
                                {campaigns.map((campaign) => (
                                  <SelectItem key={campaign.id} value={campaign.id}>
                                    {campaign.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8">
                                <Upload className="h-3 w-3 mr-1" strokeWidth={1.5} />
                                {donation.proof_of_payment ? 'Update POP' : 'Upload POP'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Upload Proof of Payment</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Select File</Label>
                                  <Input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handlePOPUpload(donation.id, file);
                                      }
                                    }}
                                    disabled={uploadingPOP}
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {donation.proof_of_payment && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => window.open(donation.proof_of_payment!, '_blank')}
                            >
                              <Eye className="h-3 w-3 mr-1" strokeWidth={1.5} />
                              View POP
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
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
