import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Users, Shield, DollarSign, Search, Pencil, Ban, CheckCircle, Megaphone, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

const ROLE_CONFIG = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-[#d1242a] text-white',
    icon: Shield,
    description: 'Full system access',
  },
  administrator: {
    label: 'Administrator',
    color: 'bg-blue-100 text-blue-800',
    icon: Users,
    description: 'Campaign & member management',
  },
  finance: {
    label: 'Finance',
    color: 'bg-green-100 text-green-800',
    icon: DollarSign,
    description: 'Financial management',
  },
  communications_officer: {
    label: 'Communications Officer',
    color: 'bg-purple-100 text-purple-800',
    icon: Megaphone,
    description: 'Broadcasting & communications',
  },
};

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'administrator',
  });
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    role: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast({
        title: 'User Created',
        description: `${formData.full_name} has been added to the system`,
      });

      setDialogOpen(false);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'administrator',
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !editFormData.full_name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.full_name,
          role: editFormData.role,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'User Updated',
        description: 'User information has been updated successfully',
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: !selectedUser.is_active,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: selectedUser.is_active ? 'User Deactivated' : 'User Activated',
        description: `${selectedUser.full_name} has been ${selectedUser.is_active ? 'deactivated' : 'activated'}`,
      });

      setDeactivateDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUser.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast({
        title: 'User Deleted',
        description: `${selectedUser.full_name} has been permanently removed from the system`,
      });

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const openDeactivateDialog = (user: User) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG]?.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'text-gray-600',
    },
    {
      label: 'Active Users',
      value: users.filter(u => u.is_active).length,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      label: 'Super Admins',
      value: users.filter(u => u.role === 'super_admin').length,
      icon: Shield,
      color: 'text-[#d1242a]',
    },
    {
      label: 'Administrators',
      value: users.filter(u => u.role === 'administrator').length,
      icon: Users,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-gray-600 font-light">Manage system users and their roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
              <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user to the system with specific role permissions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="Enter full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="communications_officer">Communications Officer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {ROLE_CONFIG[formData.role as keyof typeof ROLE_CONFIG]?.description}
                </p>
              </div>
              <Button
                type="button"
                className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                onClick={handleCreateUser}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-light text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} strokeWidth={1.5} />
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
              <CardTitle className="text-lg font-medium">System Users</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <Input
                className="pl-10 w-64"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-gray-600">No users found</p>
              <p className="text-sm text-gray-500 mt-1 font-light">
                {searchTerm ? 'Try adjusting your search' : 'Create your first user to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG];
                const RoleIcon = roleConfig?.icon || Users;

                return (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-[#d1242a]">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{user.full_name || 'Unknown'}</p>
                          <Badge className={roleConfig?.color || 'bg-gray-100 text-gray-800'}>
                            <RoleIcon className="h-3 w-3 mr-1" strokeWidth={2} />
                            {roleConfig?.label || user.role}
                          </Badge>
                          <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 font-light mt-1">{user.email}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span>Created: {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {user.id !== currentUser?.id && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={user.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          onClick={() => openDeactivateDialog(user)}
                        >
                          {user.is_active ? (
                            <>
                              <Ban className="h-4 w-4 mr-1" strokeWidth={1.5} />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" strokeWidth={1.5} />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Role Permissions</CardTitle>
          <CardDescription>Overview of role capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                <h3 className="font-medium">Super Admin</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Full system access</li>
                <li>• User management</li>
                <li>• Campaign management</li>
                <li>• Finance management</li>
                <li>• All reports and analytics</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                <h3 className="font-medium">Administrator</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Campaign creation</li>
                <li>• Member management</li>
                <li>• Broadcasting</li>
                <li>• Event management</li>
                <li>• View budgets</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                <h3 className="font-medium">Finance</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Budget management</li>
                <li>• Expense tracking</li>
                <li>• Payment reconciliation</li>
                <li>• Revenue management</li>
                <li>• Financial reports</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="h-5 w-5 text-purple-600" strokeWidth={1.5} />
                <h3 className="font-medium">Communications Officer</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Broadcasting</li>
                <li>• Message scheduling</li>
                <li>• Member engagement</li>
                <li>• Content management</li>
                <li>• Polls & surveys</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Enter full name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">Administrator</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="communications_officer">Communications Officer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {ROLE_CONFIG[editFormData.role as keyof typeof ROLE_CONFIG]?.description}
              </p>
            </div>
            <Button
              type="button"
              className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
              onClick={handleEditUser}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_active ? 'Deactivate' : 'Activate'} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedUser?.is_active ? 'deactivate' : 'activate'} {selectedUser?.full_name}?
              {selectedUser?.is_active
                ? ' They will no longer be able to access the system.'
                : ' They will regain access to the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleUserStatus}
              className={selectedUser?.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {loading ? 'Processing...' : selectedUser?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedUser?.full_name}? This action cannot be undone and will remove all user data including their profile, created campaigns, and other associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
