import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, CheckCircle, XCircle, CreditCard, Smartphone, Banknote, CheckCheck, XOctagon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Payment {
  id: string;
  payment_reference: string;
  donor_name: string;
  amount: number;
  payment_method: string;
  donation_date: string;
  campaign_id: string | null;
  payment_status: string;
  campaign?: { name: string };
}

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'eft':
      return Banknote;
    case 'card':
      return CreditCard;
    case 'wallet':
      return Smartphone;
    default:
      return CreditCard;
  }
};

const getMethodLabel = (method: string) => {
  switch (method) {
    case 'eft':
      return 'EFT';
    case 'card':
      return 'Nedbank Paytoday';
    case 'wallet':
      return 'Mobile Wallet';
    default:
      return method.toUpperCase();
  }
};

export default function PaymentReconciliation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    confirmedToday: 0,
    totalAmountPending: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          campaign:campaigns(name)
        `)
        .eq('reconciled', false)
        .order('donation_date', { ascending: false });

      if (error) throw error;

      setPendingPayments(data || []);

      const pending = (data || []).length;
      const totalAmountPending = (data || []).reduce((sum, p) => sum + Number(p.amount), 0);

      const today = new Date().toISOString().split('T')[0];
      const { data: confirmedData } = await supabase
        .from('donations')
        .select('id')
        .eq('reconciled', true)
        .gte('reconciled_at', today);

      setStats({
        pending,
        confirmedToday: confirmedData?.length || 0,
        totalAmountPending,
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleReconcile = async (donationId: string, reference: string, approved: boolean) => {
    if (!user) return;

    setProcessingId(donationId);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Unable to verify user permissions');
      }

      console.log('User role:', profileData.role);

      if (profileData.role !== 'super_admin' && profileData.role !== 'finance') {
        throw new Error('You do not have permission to reconcile payments. Only Super Admins and Finance users can perform this action.');
      }

      console.log('Updating donation:', donationId, 'Approved:', approved);

      const { data, error } = await supabase
        .from('donations')
        .update({
          reconciled: approved,
          reconciled_by: user.id,
          reconciled_at: new Date().toISOString(),
          payment_status: approved ? 'confirmed' : 'failed',
        })
        .eq('id', donationId)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Failed to update donation - no rows affected');
      }

      console.log('Successfully updated donation:', data[0]);

      setPendingPayments(prev => prev.filter(p => p.id !== donationId));

      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        confirmedToday: approved ? prev.confirmedToday + 1 : prev.confirmedToday,
        totalAmountPending: prev.totalAmountPending - Number(pendingPayments.find(p => p.id === donationId)?.amount || 0),
      }));

      toast({
        title: approved ? 'Payment Confirmed' : 'Payment Rejected',
        description: `Payment ${reference} has been ${approved ? 'reconciled and confirmed' : 'rejected'}`,
      });
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reconcile payment',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchReconcile = async (approved: boolean) => {
    if (!user || selectedPayments.size === 0) return;

    setIsBatchProcessing(true);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to verify user permissions');
      }

      if (profileData.role !== 'super_admin' && profileData.role !== 'finance') {
        throw new Error('You do not have permission to reconcile payments.');
      }

      const selectedIds = Array.from(selectedPayments);
      const { data, error } = await supabase
        .from('donations')
        .update({
          reconciled: approved,
          reconciled_by: user.id,
          reconciled_at: new Date().toISOString(),
          payment_status: approved ? 'confirmed' : 'failed',
        })
        .in('id', selectedIds)
        .select();

      if (error) throw error;

      setPendingPayments(prev => prev.filter(p => !selectedPayments.has(p.id)));

      const totalAmount = pendingPayments
        .filter(p => selectedPayments.has(p.id))
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setStats(prev => ({
        ...prev,
        pending: prev.pending - selectedIds.length,
        confirmedToday: approved ? prev.confirmedToday + selectedIds.length : prev.confirmedToday,
        totalAmountPending: prev.totalAmountPending - totalAmount,
      }));

      setSelectedPayments(new Set());

      toast({
        title: approved ? 'Payments Confirmed' : 'Payments Rejected',
        description: `${selectedIds.length} payment${selectedIds.length > 1 ? 's' : ''} ${approved ? 'confirmed' : 'rejected'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to batch reconcile payments',
        variant: 'destructive',
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const toggleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPayments.size === pendingPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(pendingPayments.map(p => p.id)));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Payment Reconciliation</h1>
        <p className="text-gray-600 font-light">Review and reconcile donations and payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Pending Reconciliation</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-xl">⏳</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Confirmed Today</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.confirmedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Amount Pending</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.totalAmountPending.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">Pending Payments</CardTitle>
              <CardDescription>Review and reconcile incoming payments</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {selectedPayments.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#d1242a] text-white">{selectedPayments.size} selected</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleBatchReconcile(true)}
                    disabled={isBatchProcessing}
                  >
                    <CheckCheck className="h-4 w-4 mr-1" strokeWidth={1.5} />
                    Confirm All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleBatchReconcile(false)}
                    disabled={isBatchProcessing}
                  >
                    <XOctagon className="h-4 w-4 mr-1" strokeWidth={1.5} />
                    Reject All
                  </Button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
                <Input
                  className="pl-10 w-64"
                  placeholder="Search by reference or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="eft">EFT Only</SelectItem>
                  <SelectItem value="card">Card Only</SelectItem>
                  <SelectItem value="wallet">Wallet Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingPayments.length > 0 && (
            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
              <Checkbox
                checked={selectedPayments.size === pendingPayments.length && pendingPayments.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-gray-600">Select all payments</span>
            </div>
          )}
          <div className="space-y-4">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-gray-600">No pending payments</p>
                <p className="text-sm text-gray-500 mt-1">All payments have been reconciled</p>
              </div>
            ) : (
              pendingPayments.map((payment) => {
                const MethodIcon = getMethodIcon(payment.payment_method);
                const isProcessing = processingId === payment.id;
                const isSelected = selectedPayments.has(payment.id);
                return (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-300 ${
                      isProcessing
                        ? 'border-[#d1242a] bg-[#d1242a]/5 scale-[0.98]'
                        : isSelected
                        ? 'border-[#d1242a] bg-[#d1242a]/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectPayment(payment.id)}
                        disabled={isProcessing}
                      />
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        isProcessing ? 'bg-[#d1242a]/20' : 'bg-[#d1242a]/10'
                      }`}>
                        <MethodIcon className="h-6 w-6 text-[#d1242a]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{payment.donor_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {getMethodLabel(payment.payment_method)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 font-light mt-1">
                          {payment.payment_reference} • {payment.campaign?.name || 'General Donation'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(payment.donation_date).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">N${Number(payment.amount).toLocaleString()}</p>
                        <Badge className={`mt-1 transition-all ${
                          isProcessing
                            ? 'bg-[#d1242a] text-white'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isProcessing ? 'Processing...' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleReconcile(payment.id, payment.payment_reference, true)}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReconcile(payment.id, payment.payment_reference, false)}
                          disabled={isProcessing}
                        >
                          <XCircle className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Payment Gateway Integration</CardTitle>
          <CardDescription>Connected payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Nedbank Paytoday</h3>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <p className="text-sm text-gray-600">Card payments</p>
              <p className="text-xs text-gray-500 mt-2">5 pending transactions</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Bank EFT</h3>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <p className="text-sm text-gray-600">Electronic transfers</p>
              <p className="text-xs text-gray-500 mt-2">12 pending transactions</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Mobile Wallets</h3>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <p className="text-sm text-gray-600">MTC & TN Mobile</p>
              <p className="text-xs text-gray-500 mt-2">6 pending transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
