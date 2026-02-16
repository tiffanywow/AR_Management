import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Plus, Gift, Search, Download, Calendar, AlertTriangle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
  date: string;
  status: string;
  source?: string;
  category?: string;
}

interface RevenueBySource {
  source: string;
  amount: number;
  count: number;
}

interface ExpenseByCategory {
  category: string;
  amount: number;
  count: number;
}

interface TrendData {
  month: string;
  revenue: number;
  expenses: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export default function Finance() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netPosition: 0,
    pendingReconciliation: 0,
    totalDonations: 0,
    previousRevenue: 0,
    previousExpenses: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [revenueBySource, setRevenueBySource] = useState<RevenueBySource[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<ExpenseByCategory[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [donations, setDonations] = useState<any[]>([]);

  const transactionsPerPage = 10;

  useEffect(() => {
    fetchFinanceData();
  }, [dateRange]);

  const getDateRangeFilter = () => {
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return null;
    }

    return startDate.toISOString();
  };

  const fetchFinanceData = async () => {
    try {
      const dateFilter = getDateRangeFilter();

      let revenueQuery = supabase.from('party_revenue').select('*');
      let expensesQuery = supabase.from('party_expenses').select('*');

      if (dateFilter) {
        revenueQuery = revenueQuery.gte('revenue_date', dateFilter);
        expensesQuery = expensesQuery.gte('expense_date', dateFilter);
      }

      const [revenueRes, expensesRes, donationsRes, allDonationsRes, campaignsRes] = await Promise.all([
        revenueQuery,
        expensesQuery,
        supabase.from('donations').select('*').eq('payment_status', 'pending'),
        supabase.from('donations').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(3),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const netPosition = totalRevenue - totalExpenses;
      const pendingReconciliation = donationsRes.data?.length || 0;

      const totalDonations = (allDonationsRes.data || []).reduce((sum, d) => sum + Number(d.amount), 0);
      setDonations(allDonationsRes.data || []);

      setStats({
        totalRevenue,
        totalExpenses,
        netPosition,
        pendingReconciliation,
        totalDonations,
        previousRevenue: 0,
        previousExpenses: 0,
      });

      const transactions: Transaction[] = [
        ...(revenueRes.data || []).map(r => ({
          id: r.id,
          description: r.description,
          amount: Number(r.amount),
          type: 'revenue' as const,
          date: r.revenue_date,
          status: 'confirmed',
          source: r.source,
        })),
        ...(expensesRes.data || []).map(e => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          type: 'expense' as const,
          date: e.expense_date,
          status: e.status,
          category: e.category,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllTransactions(transactions);
      setRecentTransactions(transactions.slice(0, 5));
      setCampaigns(campaignsRes.data || []);

      calculateRevenueBySource(revenueRes.data || [], allDonationsRes.data || []);
      calculateExpenseByCategory(expensesRes.data || []);
      calculateTrendData(revenueRes.data || [], expensesRes.data || []);
      generateAlerts({
        pendingReconciliation,
        campaigns: campaignsRes.data || [],
        netPosition,
        expenses: expensesRes.data || [],
      });
    } catch (error) {
      console.error('Error fetching finance data:', error);
    }
  };

  const calculateRevenueBySource = (revenues: any[], donations: any[]) => {
    const sourceMap = new Map<string, { amount: number; count: number }>();

    revenues.forEach(r => {
      const source = r.source || 'other';
      const current = sourceMap.get(source) || { amount: 0, count: 0 };
      sourceMap.set(source, {
        amount: current.amount + Number(r.amount),
        count: current.count + 1,
      });
    });

    // Add donations as a revenue source
    if (donations.length > 0) {
      const donationTotal = donations.reduce((sum, d) => sum + Number(d.amount), 0);
      sourceMap.set('donations', {
        amount: donationTotal,
        count: donations.length,
      });
    }

    const result: RevenueBySource[] = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source: source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      amount: data.amount,
      count: data.count,
    }));

    setRevenueBySource(result.sort((a, b) => b.amount - a.amount));
  };

  const calculateExpenseByCategory = (expenses: any[]) => {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    expenses.forEach(e => {
      const category = e.category || 'other';
      const current = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: current.amount + Number(e.amount),
        count: current.count + 1,
      });
    });

    const result: ExpenseByCategory[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category: category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      amount: data.amount,
      count: data.count,
    }));

    setExpenseByCategory(result);
  };

  const calculateTrendData = (revenues: any[], expenses: any[]) => {
    const monthMap = new Map<string, { revenue: number; expenses: number }>();

    revenues.forEach(r => {
      const month = new Date(r.revenue_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const current = monthMap.get(month) || { revenue: 0, expenses: 0 };
      monthMap.set(month, { ...current, revenue: current.revenue + Number(r.amount) });
    });

    expenses.forEach(e => {
      const month = new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const current = monthMap.get(month) || { revenue: 0, expenses: 0 };
      monthMap.set(month, { ...current, expenses: current.expenses + Number(e.amount) });
    });

    const result: TrendData[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        return new Date(`${aMonth} 20${aYear}`).getTime() - new Date(`${bMonth} 20${bYear}`).getTime();
      })
      .slice(-6);

    setTrendData(result);
  };

  const generateAlerts = (data: any) => {
    const newAlerts: string[] = [];

    if (data.pendingReconciliation > 0) {
      newAlerts.push(`${data.pendingReconciliation} payment${data.pendingReconciliation > 1 ? 's' : ''} pending reconciliation`);
    }

    data.campaigns.forEach((campaign: any) => {
      const percentage = campaign.target_amount > 0
        ? (Number(campaign.raised_amount) / Number(campaign.target_amount)) * 100
        : 0;
      if (percentage > 90) {
        newAlerts.push(`${campaign.name} is at ${percentage.toFixed(0)}% of budget`);
      }
    });

    if (data.netPosition < 0) {
      newAlerts.push('Negative cash position - expenses exceed revenue');
    }

    const pendingExpenses = data.expenses.filter((e: any) => e.status === 'pending');
    if (pendingExpenses.length > 0) {
      newAlerts.push(`${pendingExpenses.length} expense${pendingExpenses.length > 1 ? 's' : ''} awaiting approval`);
    }

    setAlerts(newAlerts);
  };

  const filteredTransactions = allTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = transactionFilter === 'all' || t.type === transactionFilter;
    return matchesSearch && matchesFilter;
  });

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );

  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const revenueChange = stats.previousRevenue > 0
    ? ((stats.totalRevenue - stats.previousRevenue) / stats.previousRevenue * 100).toFixed(1)
    : '0.0';

  const expenseChange = stats.previousExpenses > 0
    ? ((stats.totalExpenses - stats.previousExpenses) / stats.previousExpenses * 100).toFixed(1)
    : '0.0';

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status'];
    const csvData = filteredTransactions.map(t => [
      t.date,
      t.type,
      t.description,
      t.amount,
      t.status,
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-report-${dateRange}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600 font-light">Comprehensive financial overview and management</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" strokeWidth={1.5} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue & Donations</TabsTrigger>
          <TabsTrigger value="expenses" onClick={() => navigate('/finance/expenses')}>Manage Expenses</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">

      {alerts.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />
          <AlertDescription className="ml-2">
            <div className="space-y-1">
              {alerts.map((alert, idx) => (
                <div key={idx} className="text-sm text-yellow-800">{alert}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-light text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.totalRevenue.toLocaleString()}</p>
                {revenueChange !== '0.0' && (
                  <p className={`text-xs mt-1 ${Number(revenueChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(revenueChange) >= 0 ? '+' : ''}{revenueChange}% vs previous period
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-light text-gray-600">Total Expenses</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.totalExpenses.toLocaleString()}</p>
                {expenseChange !== '0.0' && (
                  <p className={`text-xs mt-1 ${Number(expenseChange) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(expenseChange) >= 0 ? '+' : ''}{expenseChange}% vs previous period
                  </p>
                )}
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Donations</p>
                <p className="text-2xl font-semibold text-gray-900">N${stats.totalDonations.toLocaleString()}</p>
              </div>
              <Gift className="h-8 w-8 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Net Position</p>
                <p className={`text-2xl font-semibold ${stats.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  N${stats.netPosition.toLocaleString()}
                </p>
                <Badge className={`mt-2 ${stats.netPosition >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {stats.netPosition >= 0 ? 'Surplus' : 'Deficit'}
                </Badge>
              </div>
              <DollarSign className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/finance/reconciliation')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Pending Reconciliation</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingReconciliation}</p>
                {stats.pendingReconciliation > 0 && (
                  <Badge className="mt-2 bg-yellow-100 text-yellow-800">Action Required</Badge>
                )}
              </div>
              <CreditCard className="h-8 w-8 text-yellow-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Financial Performance Trend</CardTitle>
          <CardDescription>Revenue vs Expenses over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: any) => `N$${Number(value).toLocaleString()}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Revenue Sources</CardTitle>
            <CardDescription>Income breakdown by source</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueBySource.length > 0 ? (
              <div className="space-y-3">
                {revenueBySource.map((source, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{source.source}</p>
                        <p className="text-xs text-gray-600">{source.count} transaction{source.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">N${source.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No revenue data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Expense Categories</CardTitle>
            <CardDescription>Spending breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length > 0 ? (
              <div className="space-y-3">
                {expenseByCategory.map((category, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{category.category}</p>
                        <p className="text-xs text-gray-600">{category.count} transaction{category.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">N${category.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No expense data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Active Campaign Budgets</CardTitle>
            <CardDescription>Budget utilization status</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No active campaigns
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => {
                  const percentage = campaign.target_amount > 0
                    ? (Number(campaign.raised_amount) / Number(campaign.target_amount)) * 100
                    : 0;
                  return (
                    <div key={campaign.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate('/finance/budgets')}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900">{campaign.name}</span>
                        <Badge className={percentage > 90 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                          {percentage.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${percentage > 90 ? 'bg-yellow-500' : 'bg-[#d1242a]'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>N${Number(campaign.raised_amount).toLocaleString()}</span>
                        <span>N${Number(campaign.target_amount).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Transaction History</CardTitle>
                  <CardDescription>Complete list of all financial transactions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
                    <Input
                      className="pl-10 w-64"
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                    <SelectTrigger className="w-32">
                      <Filter className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paginatedTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-gray-600">No transactions found</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or date range</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.type === 'revenue' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {transaction.type === 'revenue' ? (
                              <TrendingUp className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600" strokeWidth={1.5} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-600">{new Date(transaction.date).toLocaleDateString()}</p>
                              <Badge variant="outline" className="text-xs">
                                {transaction.source || transaction.category || transaction.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'revenue' ? '+' : '-'}N${Math.abs(transaction.amount).toLocaleString()}
                          </p>
                          <Badge className={`mt-1 text-xs ${
                            transaction.status === 'confirmed' || transaction.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * transactionsPerPage) + 1} to {Math.min(currentPage * transactionsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                          Previous
                        </Button>
                        <div className="flex gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button
                              key={page}
                              variant={page === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-10"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Revenue & Donations Management</h3>
              <p className="text-sm text-gray-600 mt-1">Track and manage all income sources</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/finance/donations')}>
                <Gift className="mr-2 h-4 w-4" strokeWidth={1.5} />
                View Donations
              </Button>
              <Button onClick={() => navigate('/finance/revenue')}>
                <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Add Revenue
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">N${stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">For selected period</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" strokeWidth={1.5} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-gray-600">Total Donations</p>
                    <p className="text-2xl font-semibold text-gray-900">N${stats.totalDonations.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">All time total</p>
                  </div>
                  <Gift className="h-8 w-8 text-blue-600" strokeWidth={1.5} />
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/finance/reconciliation')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-gray-600">Pending Reconciliation</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.pendingReconciliation}</p>
                    {stats.pendingReconciliation > 0 && (
                      <Badge className="mt-2 bg-yellow-100 text-yellow-800">Requires Action</Badge>
                    )}
                  </div>
                  <CreditCard className="h-8 w-8 text-yellow-600" strokeWidth={1.5} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Revenue by Source</CardTitle>
                <CardDescription>Breakdown of income streams</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueBySource.length > 0 ? (
                  <div className="space-y-3">
                    {revenueBySource.map((source, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{source.source}</p>
                            <p className="text-xs text-gray-600">{source.count} transaction{source.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">N${source.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    No revenue data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Recent Revenue Transactions</CardTitle>
                <CardDescription>Latest income entries</CardDescription>
              </CardHeader>
              <CardContent>
                {(allTransactions.filter(t => t.type === 'revenue').length > 0 || donations.length > 0) ? (
                  <div className="space-y-3">
                    {allTransactions.filter(t => t.type === 'revenue').slice(0, 3).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-xs text-gray-600">{new Date(transaction.date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm font-semibold text-green-600">+N${transaction.amount.toLocaleString()}</p>
                      </div>
                    ))}
                    {donations.slice(0, 2).map((donation) => (
                      <div key={donation.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Donation from {donation.donor_name}</p>
                          <p className="text-xs text-gray-600">{new Date(donation.donation_date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm font-semibold text-green-600">+N${Number(donation.amount).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    No transactions yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Recent Donations</CardTitle>
                  <CardDescription>Latest donation transactions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/finance/donations')}>
                  View All Donations
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {donations.length > 0 ? (
                <div className="space-y-3">
                  {donations.slice(0, 10).map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Gift className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{donation.donor_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-600">{new Date(donation.created_at).toLocaleDateString()}</p>
                            <Badge variant="outline" className="text-xs">
                              {donation.payment_method}
                            </Badge>
                            {donation.reconciled ? (
                              <Badge className="text-xs bg-green-100 text-green-800">Reconciled</Badge>
                            ) : (
                              <Badge className="text-xs bg-yellow-100 text-yellow-800">Pending</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-blue-600">N${Number(donation.amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-gray-600">No donations yet</p>
                  <p className="text-sm text-gray-500 mt-1">Donations will appear here once received</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Expense Management</h3>
              <p className="text-sm text-gray-600 mt-1">Monitor and control organizational spending</p>
            </div>
            <Button onClick={() => navigate('/finance/expenses')}>
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Add Expense
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-semibold text-gray-900">N${stats.totalExpenses.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">For selected period</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" strokeWidth={1.5} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-light text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {allTransactions.filter(t => t.type === 'expense' && t.status === 'pending').length}
                  </p>
                  <Badge className="mt-2 bg-yellow-100 text-yellow-800">Needs Review</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-light text-gray-600">Approved</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {allTransactions.filter(t => t.type === 'expense' && t.status === 'approved').length}
                  </p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Ready to Pay</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div>
                  <p className="text-sm font-light text-gray-600">Paid</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {allTransactions.filter(t => t.type === 'expense' && t.status === 'paid').length}
                  </p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">Completed</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Expense by Category</CardTitle>
                <CardDescription>Spending breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseByCategory.length > 0 ? (
                  <div className="space-y-3">
                    {expenseByCategory.map((category, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{category.category}</p>
                            <p className="text-xs text-gray-600">{category.count} transaction{category.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">N${category.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    No expense data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Recent Expense Transactions</CardTitle>
                <CardDescription>Latest spending entries</CardDescription>
              </CardHeader>
              <CardContent>
                {allTransactions.filter(t => t.type === 'expense').length > 0 ? (
                  <div className="space-y-3">
                    {allTransactions.filter(t => t.type === 'expense').slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-600">{new Date(transaction.date).toLocaleDateString()}</p>
                            <Badge variant="outline" className="text-xs">{transaction.status}</Badge>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-red-600">-N${transaction.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    No transactions yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Campaign Budget Management</h3>
              <p className="text-sm text-gray-600 mt-1">Monitor campaign spending and budget utilization</p>
            </div>
            <Button onClick={() => navigate('/finance/budgets')}>
              View All Budgets
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Budget Status</CardTitle>
              <CardDescription>Campaign budget utilization</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  No campaign budgets yet
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => {
                    const percentage = campaign.target_amount > 0
                      ? (Number(campaign.raised_amount) / Number(campaign.target_amount)) * 100
                      : 0;
                    return (
                      <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate('/finance/budgets')}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900">{campaign.name}</span>
                          <Badge className={percentage > 90 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                            {percentage.toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full transition-all ${percentage > 90 ? 'bg-yellow-500' : 'bg-[#d1242a]'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>N${Number(campaign.raised_amount).toLocaleString()} raised</span>
                          <span>Target: N${Number(campaign.target_amount).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
