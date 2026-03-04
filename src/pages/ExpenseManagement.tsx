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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingDown, DollarSign, FileText, Calendar, ArrowLeft, Search, Filter, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendRoleNotification } from '@/lib/notificationTriggers';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  status: string;
  created_at: string;
}

export default function ExpenseManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    paidExpenses: 0,
  });

  const [formData, setFormData] = useState({
    category: 'salaries',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('party_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;

      setExpenses(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const calculateStats = (data: Expense[]) => {
    const totalExpenses = data.reduce((sum, e) => sum + Number(e.amount), 0);
    const pendingExpenses = data.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0);
    const approvedExpenses = data.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0);
    const paidExpenses = data.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0);

    setStats({ totalExpenses, pendingExpenses, approvedExpenses, paidExpenses });
  };

  const handleAddExpense = async () => {
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
      const { error } = await supabase.from('party_expenses').insert([
        {
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: formData.expense_date,
          status: 'pending',
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Expense Added',
        description: 'Expense record has been added and is pending approval',
      });

        // also send role-based notifications to super_admin and finance
        try {
          await sendRoleNotification({
            roles: ['super_admin', 'finance'],
            type: 'expense_recorded',
            title: 'Expense Added',
            message: `${user?.email || user?.id} added an expense: ${formData.description} — ${formData.amount}`,
            data: { amount: parseFloat(formData.amount), category: formData.category },
          });
        } catch (err) {
          console.error('Failed to send role notification for expense:', err);
        }

      setDialogOpen(false);
      setFormData({
        category: 'salaries',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
      });

      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add expense',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (expenseId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('party_expenses')
        .update({
          status: newStatus,
          approved_by: newStatus === 'approved' || newStatus === 'paid' ? user?.id : null,
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Expense has been marked as ${newStatus}`,
      });

      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'salaries':
        return 'bg-blue-100 text-blue-800';
      case 'rent':
        return 'bg-purple-100 text-purple-800';
      case 'utilities':
        return 'bg-yellow-100 text-yellow-800';
      case 'marketing':
        return 'bg-green-100 text-green-800';
      case 'transport':
        return 'bg-orange-100 text-orange-800';
      case 'supplies':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filterExpenses = (status?: string) => {
    let filtered = expenses;

    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const exportExpenses = (status?: string) => {
    const expensesToExport = filterExpenses(status);
    const csvContent = [
      'Date,Category,Description,Amount,Status',
      ...expensesToExport.map(e =>
        `${e.expense_date},${getCategoryLabel(e.category)},"${e.description}",${e.amount},${e.status}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses_${status || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderExpenseList = (status?: string) => {
    const filtered = filterExpenses(status);

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12">
          <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-gray-600">No expenses found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{expense.description}</p>
                  <Badge className={getCategoryColor(expense.category)}>
                    {getCategoryLabel(expense.category)}
                  </Badge>
                  <Badge className={getStatusColor(expense.status)}>
                    {expense.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="h-3 w-3" strokeWidth={1.5} />
                  {new Date(expense.expense_date).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-lg font-semibold text-red-600">
                -N${Number(expense.amount).toLocaleString()}
              </p>
              {expense.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:text-green-700"
                  onClick={() => handleUpdateStatus(expense.id, 'approved')}
                >
                  Approve
                </Button>
              )}
              {expense.status === 'approved' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => handleUpdateStatus(expense.id, 'paid')}
                >
                  Mark Paid
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/finance')}>
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Expense Management</h1>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense Record</DialogTitle>
              <DialogDescription>Record a new party expense</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Expense Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaries">Salaries</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="supplies">Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Enter expense description"
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
                <Label>Expense Date</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
              </div>

              <Button
                className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                onClick={handleAddExpense}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-xl font-semibold text-gray-900">N${stats.totalExpenses.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-red-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-xl font-semibold text-yellow-600">N${stats.pendingExpenses.toLocaleString()}</p>
              </div>
              <DollarSign className="h-6 w-6 text-yellow-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Approved</p>
                <p className="text-xl font-semibold text-blue-600">N${stats.approvedExpenses.toLocaleString()}</p>
              </div>
              <FileText className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Paid</p>
                <p className="text-xl font-semibold text-green-600">N${stats.paidExpenses.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-green-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Manage Expenses</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="salaries">Salaries</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => exportExpenses()}>
                  <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Export
                </Button>
              </div>
              {renderExpenseList()}
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => exportExpenses('pending')}>
                  <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Export
                </Button>
              </div>
              {renderExpenseList('pending')}
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => exportExpenses('approved')}>
                  <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Export
                </Button>
              </div>
              {renderExpenseList('approved')}
            </TabsContent>

            <TabsContent value="paid" className="mt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => exportExpenses('paid')}>
                  <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Export
                </Button>
              </div>
              {renderExpenseList('paid')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
