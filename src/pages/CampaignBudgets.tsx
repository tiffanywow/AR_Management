import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, DollarSign, TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  id: string;
  name: string;
  target_amount: number;
  raised_amount: number;
}

interface BudgetItem {
  id: string;
  campaign_id: string;
  category: string;
  description: string;
  budgeted_amount: number;
  actual_amount: number;
  campaigns?: { name: string };
}

const categoryColors: Record<string, string> = {
  venue: 'bg-blue-100 text-blue-800',
  transport: 'bg-green-100 text-green-800',
  marketing: 'bg-purple-100 text-purple-800',
  catering: 'bg-yellow-100 text-yellow-800',
  equipment: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function CampaignBudgets() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);
  const [selectedCampaignForFunding, setSelectedCampaignForFunding] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    campaign_id: '',
    category: 'venue',
    description: '',
    budgeted_amount: '',
  });
  const [fundingAmount, setFundingAmount] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  useEffect(() => {
    fetchCampaigns();
    fetchBudgetItems();
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

  const fetchBudgetItems = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_budget_items')
        .select(`
          *,
          campaigns (name)
        `);

      if (error) {
        console.log('Budget items table may not exist yet:', error);
        return;
      }

      setBudgetItems(data || []);
    } catch (error) {
      console.error('Error fetching budget items:', error);
    }
  };

  const handleAddBudget = async () => {
    if (!user || !formData.campaign_id || !formData.description || !formData.budgeted_amount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('campaign_budget_items').insert([
        {
          campaign_id: formData.campaign_id,
          category: formData.category,
          description: formData.description,
          budgeted_amount: parseFloat(formData.budgeted_amount),
          actual_amount: 0,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Budget Item Added',
        description: 'Budget item has been added successfully',
      });

      setDialogOpen(false);
      setFormData({
        campaign_id: '',
        category: 'venue',
        description: '',
        budgeted_amount: '',
      });

      fetchBudgetItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add budget item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBudgetItems = selectedCampaign === 'all'
    ? budgetItems
    : budgetItems.filter(item => item.campaigns?.name === selectedCampaign);

  const calculateCampaignSpent = (campaignId: string) => {
    return budgetItems
      .filter(item => item.campaign_id === campaignId)
      .reduce((sum, item) => sum + Number(item.actual_amount), 0);
  };

  const calculateCampaignBudget = (campaignId: string) => {
    return budgetItems
      .filter(item => item.campaign_id === campaignId)
      .reduce((sum, item) => sum + Number(item.budgeted_amount), 0);
  };

  const handleAddFunding = async () => {
    if (!selectedCampaignForFunding || !fundingAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a funding amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const newRaisedAmount = Number(selectedCampaignForFunding.raised_amount) + Number(fundingAmount);

      const { error } = await supabase
        .from('campaigns')
        .update({ raised_amount: newRaisedAmount })
        .eq('id', selectedCampaignForFunding.id);

      if (error) throw error;

      toast({
        title: 'Funding Added',
        description: `N$${Number(fundingAmount).toLocaleString()} added to ${selectedCampaignForFunding.name}`,
      });

      setFundDialogOpen(false);
      setFundingAmount('');
      setSelectedCampaignForFunding(null);
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add funding',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordExpense = async () => {
    if (!selectedBudgetItem || !expenseAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please enter an expense amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const newActualAmount = Number(selectedBudgetItem.actual_amount) + Number(expenseAmount);

      const { error } = await supabase
        .from('campaign_budget_items')
        .update({ actual_amount: newActualAmount })
        .eq('id', selectedBudgetItem.id);

      if (error) throw error;

      toast({
        title: 'Expense Recorded',
        description: `N$${Number(expenseAmount).toLocaleString()} recorded for ${selectedBudgetItem.description}`,
      });

      setExpenseDialogOpen(false);
      setExpenseAmount('');
      setSelectedBudgetItem(null);
      fetchBudgetItems();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record expense',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaign Budgets</h1>
          <p className="text-gray-600 font-light">Manage budgets and expenses for campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/finance')}>
            Back to Finance
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
                <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Add Budget Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Item</DialogTitle>
                <DialogDescription>Create a new budget item for a campaign</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select value={formData.campaign_id} onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venue">Venue</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Enter budget item description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budgeted Amount (N$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.budgeted_amount}
                    onChange={(e) => setFormData({ ...formData, budgeted_amount: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                  onClick={handleAddBudget}
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Budget Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Campaign Funding</DialogTitle>
            <DialogDescription>
              Add funds to {selectedCampaignForFunding?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Funding</Label>
              <div className="text-2xl font-semibold text-gray-900">
                N${Number(selectedCampaignForFunding?.raised_amount || 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount to Add (N$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
              />
            </div>
            {fundingAmount && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-600">New Total Funding</p>
                <p className="text-xl font-semibold text-green-600">
                  N${(Number(selectedCampaignForFunding?.raised_amount || 0) + Number(fundingAmount)).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
              onClick={handleAddFunding}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Funding'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>
              Record an expense for {selectedBudgetItem?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budgeted Amount</Label>
                <div className="text-lg font-semibold text-gray-900">
                  N${Number(selectedBudgetItem?.budgeted_amount || 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Current Spent</Label>
                <div className="text-lg font-semibold text-red-600">
                  N${Number(selectedBudgetItem?.actual_amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expense Amount (N$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            {expenseAmount && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-gray-600">New Total Spent</p>
                <p className="text-xl font-semibold text-red-600">
                  N${(Number(selectedBudgetItem?.actual_amount || 0) + Number(expenseAmount)).toLocaleString()}
                </p>
                <div className="mt-2 pt-2 border-t border-red-200">
                  <p className="text-xs text-gray-600">Remaining Budget</p>
                  <p className={`text-sm font-semibold ${
                    Number(selectedBudgetItem?.budgeted_amount || 0) - (Number(selectedBudgetItem?.actual_amount || 0) + Number(expenseAmount)) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    N${(Number(selectedBudgetItem?.budgeted_amount || 0) - (Number(selectedBudgetItem?.actual_amount || 0) + Number(expenseAmount))).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            <Button
              className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
              onClick={handleRecordExpense}
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {campaigns.slice(0, 3).map((campaign) => {
          const spent = calculateCampaignSpent(campaign.id);
          const funded = Number(campaign.raised_amount) || 0;
          const budget = calculateCampaignBudget(campaign.id) || Number(campaign.target_amount) || 1;
          const percentage = funded > 0 ? (spent / funded) * 100 : 0;
          const remaining = funded - spent;
          return (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCampaignForFunding(campaign);
                        setFundDialogOpen(true);
                      }}
                    >
                      <Wallet className="h-4 w-4 mr-1" strokeWidth={1.5} />
                      Add Funds
                    </Button>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Budget Utilization</span>
                      <span className="font-medium">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Funded</p>
                      <p className="font-semibold text-green-600">N${funded.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Spent</p>
                      <p className="font-semibold text-red-600">N${spent.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">Remaining</p>
                      <p className="font-semibold">{remaining >= 0 ? `N$${remaining.toLocaleString()}` : `-N$${Math.abs(remaining).toLocaleString()}`}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">Budget Breakdown</CardTitle>
              <CardDescription>Detailed budget items by campaign</CardDescription>
            </div>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.name}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBudgetItems.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-gray-600">No budget items yet</p>
                <p className="text-sm text-gray-500 mt-1">Add your first budget item to get started</p>
              </div>
            ) : (
              filteredBudgetItems.map((item) => {
                const variance = Number(item.actual_amount) - Number(item.budgeted_amount);
                const variancePercent = Number(item.budgeted_amount) > 0
                  ? ((variance / Number(item.budgeted_amount)) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#d1242a]/10 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[item.category]}`}>
                            {item.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-light mt-1">{item.campaigns?.name || 'Unknown Campaign'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-xs text-gray-600">Budgeted</p>
                          <p className="font-semibold">N${Number(item.budgeted_amount).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Actual</p>
                          <p className="font-semibold">N${Number(item.actual_amount).toLocaleString()}</p>
                        </div>
                        <div className="w-20">
                          <p className="text-xs text-gray-600">Variance</p>
                          <div className="flex items-center gap-1">
                            {variance < 0 ? (
                              <TrendingDown className="h-3 w-3 text-green-600" strokeWidth={2} />
                            ) : (
                              <TrendingUp className="h-3 w-3 text-red-600" strokeWidth={2} />
                            )}
                            <p className={`text-sm font-semibold ${variance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {variancePercent}%
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBudgetItem(item);
                          setExpenseDialogOpen(true);
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-1" strokeWidth={1.5} />
                        Add Expense
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
