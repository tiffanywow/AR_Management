import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, UserPlus, CheckCircle, XCircle, Eye, MapPin, Phone, Mail, Calendar, Briefcase, Home, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const COLORS = ['#d1242a', '#ef4444', '#f87171', '#fca5a5'];

interface RegionClassification {
  id: string;
  region_name: string;
  region_code: string;
}

const REGIONS = [
  'Khomas', 'Erongo', 'Hardap', 'Kharas', 'Kavango East', 'Kavango West',
  'Kunene', 'Ohangwena', 'Omaheke', 'Omusati', 'Oshana', 'Oshikoto', 'Otjozondjupa', 'Zambezi'
];

interface Member {
  id: string;
  user_id: string | null;
  full_name: string;
  surname: string;
  id_number: string | null;
  email: string;
  phone_number: string | null;
  region: string | null;
  home_language: string | null;
  address: string | null;
  occupation: string | null;
  town_city: string | null;
  constituency: string | null;
  village_suburb: string | null;
  po_box: string | null;
  date_of_birth: string | null;
  gender: string | null;
  status: string;
  created_at: string;
  membership_number: string | null;
  passport_photo_url: string | null;
  id_card_photo_url: string | null;
  supporting_documents_urls: string[] | null;
  wants_to_volunteer: boolean | null;
  volunteer_interests: string[] | null;
  volunteer_availability: string[] | null;
  interested_in_leadership: boolean | null;
  declaration_name: string | null;
  signature_data: string | null;
  declaration_accepted: boolean | null;
  approved_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
}

export default function Members() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [regionClassifications, setRegionClassifications] = useState<RegionClassification[]>([]);

  const [formData, setFormData] = useState({
    full_name: '',
    surname: '',
    id_number: '',
    email: '',
    phone: '',
    region: '',
    constituency: '',
    town: '',
    village_suburb: '',
    address: '',
    po_box: '',
    date_of_birth: '',
    gender: '',
    home_language: '',
    occupation: '',
    membership_type: 'supporter',
    membership_number: '',
  });

  useEffect(() => {
    fetchMembers();
    fetchRegionClassifications();
  }, []);

  const fetchRegionClassifications = async () => {
    try {
      const { data, error } = await supabase
        .from('region_classifications')
        .select('*')
        .order('region_code', { ascending: true });

      if (error) throw error;

      setRegionClassifications(data || []);
    } catch (error) {
      console.error('Error fetching region classifications:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMembers(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const calculateStats = (data: Member[]) => {
    const regionCounts: Record<string, number> = {};
    data.forEach(m => {
      if (m.region) {
        regionCounts[m.region] = (regionCounts[m.region] || 0) + 1;
      }
    });

    const regionStats = Object.entries(regionCounts)
      .map(([region, members]) => ({ region, members }))
      .sort((a, b) => b.members - a.members)
      .slice(0, 5);

    setRegionData(regionStats);

    const ageCounts = { '18-25': 0, '26-35': 0, '36-50': 0, '51+': 0 };
    const today = new Date();

    data.forEach(m => {
      if (m.date_of_birth) {
        const age = Math.floor((today.getTime() - new Date(m.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age >= 18 && age <= 25) ageCounts['18-25']++;
        else if (age >= 26 && age <= 35) ageCounts['26-35']++;
        else if (age >= 36 && age <= 50) ageCounts['36-50']++;
        else if (age > 50) ageCounts['51+']++;
      }
    });

    const total = Object.values(ageCounts).reduce((a, b) => a + b, 0);
    const ageStats = Object.entries(ageCounts).map(([name, count]) => ({
      name,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
      count,
    }));

    setAgeData(ageStats);
  };

  const handleAddMember = async () => {
    if (!formData.full_name || !formData.surname || !formData.id_number || !formData.phone || !formData.region || !formData.home_language || !formData.gender || !formData.membership_number) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('memberships').insert([{
        full_name: formData.full_name,
        surname: formData.surname,
        id_number: formData.id_number,
        email: formData.email || null,
        phone_number: formData.phone,
        region: formData.region,
        constituency: formData.constituency || null,
        town_city: formData.town || null,
        village_suburb: formData.village_suburb || null,
        address: formData.address || null,
        po_box: formData.po_box || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender,
        home_language: formData.home_language,
        occupation: formData.occupation || null,
        membership_number: formData.membership_number,
        status: 'approved',
        declaration_name: formData.full_name + ' ' + formData.surname,
        signature_data: 'admin-created',
        declaration_accepted: true,
      }]);

      if (error) throw error;

      toast({
        title: 'Member Added',
        description: 'New member has been added successfully',
      });

      setDialogOpen(false);
      setFormData({
        full_name: '',
        surname: '',
        id_number: '',
        email: '',
        phone: '',
        region: '',
        constituency: '',
        town: '',
        village_suburb: '',
        address: '',
        po_box: '',
        date_of_birth: '',
        gender: '',
        home_language: '',
        occupation: '',
        membership_type: 'supporter',
        membership_number: '',
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMembershipNumber = async (regionName: string) => {
    const regionClass = regionClassifications.find(r => r.region_name === regionName);

    if (!regionClass) {
      return '';
    }

    const regionCode = regionClass.region_code;

    const { data, error } = await supabase
      .from('memberships')
      .select('membership_number')
      .like('membership_number', `${regionCode}-%`)
      .not('membership_number', 'is', null)
      .order('membership_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last membership number:', error);
      return `${regionCode}-0001`;
    }

    if (!data || data.length === 0) {
      return `${regionCode}-0001`;
    }

    const lastNumber = data[0].membership_number;
    const numPart = parseInt(lastNumber.split('-')[1]);
    const nextNum = numPart + 1;
    return `${regionCode}-${String(nextNum).padStart(4, '0')}`;
  };

  const handleRegionChange = async (region: string) => {
    setFormData({ ...formData, region });
    const membershipNumber = await generateMembershipNumber(region);
    setFormData(prev => ({ ...prev, region, membership_number: membershipNumber }));
  };

  const handleApproveMember = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const member = members.find(m => m.id === memberId);
      if (!member || !member.region) {
        toast({
          title: 'Error',
          description: 'Member region not found',
          variant: 'destructive',
        });
        return;
      }

      const membershipNumber = await generateMembershipNumber(member.region);
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('memberships')
        .update({
          status: 'approved',
          membership_number: membershipNumber,
          approved_at: now,
          membership_card_issued: false,
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      if (member.email) {
        await supabase.from('notifications').insert([{
          user_id: member.email,
          title: 'Membership Approved!',
          message: `Congratulations! Your membership has been approved. Your membership number is ${membershipNumber}.`,
          type: 'membership_approved',
          data: { membership_number: membershipNumber },
          is_read: false,
        }]);
      }

      toast({
        title: 'Member Approved',
        description: `Membership ${membershipNumber} has been approved successfully.`,
      });

      fetchMembers();
    } catch (error) {
      console.error('Error approving member:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve membership',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineMember = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const { error: updateError } = await supabase
        .from('memberships')
        .update({
          status: 'rejected',
          rejection_reason: 'Application declined by administrator',
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      const member = members.find(m => m.id === memberId);
      if (member) {
        await supabase.from('notifications').insert([{
          user_id: member.email,
          title: 'Membership Application Update',
          message: 'Your membership application has been declined. Please contact support for more information.',
          type: 'membership_rejected',
          data: {},
          is_read: false,
        }]);
      }

      toast({
        title: 'Member Declined',
        description: 'Membership application has been declined.',
      });

      fetchMembers();
    } catch (error) {
      console.error('Error declining member:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline membership',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Region', 'Status', 'Joined Date'].join(','),
      ...members.map(m => [
        `${m.full_name} ${m.surname}`,
        m.email,
        m.phone_number || '',
        m.region || '',
        m.status,
        new Date(m.created_at).toLocaleDateString(),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Export Complete',
      description: `Exported ${members.length} members to CSV`,
    });
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.region && m.region.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="text-gray-600 font-light">Manage and analyze your party membership ({members.length} total members)</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#d1242a] hover:bg-[#b91c1c]">
                <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>Register a new party member</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      placeholder="Enter first name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Surname *</Label>
                    <Input
                      placeholder="Enter surname"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID Number *</Label>
                    <Input
                      placeholder="Enter ID number"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Membership Number *</Label>
                    <Input
                      placeholder="e.g., B-0001"
                      value={formData.membership_number}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Auto-generated based on selected region</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      placeholder="+264 81 234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="member@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date of Birth (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Home Language *</Label>
                    <Input
                      placeholder="e.g., English, Oshiwambo"
                      value={formData.home_language}
                      onChange={(e) => setFormData({ ...formData, home_language: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Occupation (Optional)</Label>
                    <Input
                      placeholder="e.g., Teacher, Engineer"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Region *</Label>
                  <Select value={formData.region} onValueChange={handleRegionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Constituency (Optional)</Label>
                    <Input
                      placeholder="Enter constituency"
                      value={formData.constituency}
                      onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Town/City (Optional)</Label>
                    <Input
                      placeholder="e.g., Windhoek"
                      value={formData.town}
                      onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Village/Suburb (Optional)</Label>
                    <Input
                      placeholder="Enter village or suburb"
                      value={formData.village_suburb}
                      onChange={(e) => setFormData({ ...formData, village_suburb: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>PO Box (Optional)</Label>
                    <Input
                      placeholder="e.g., P.O. Box 1234"
                      value={formData.po_box}
                      onChange={(e) => setFormData({ ...formData, po_box: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Physical Address (Optional)</Label>
                  <Input
                    placeholder="Enter full physical address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                  onClick={handleAddMember}
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
          <Input
            className="pl-10"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Membership Applications</CardTitle>
          <CardDescription>Review and manage party member applications</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-gray-600">No members found</p>
              <p className="text-sm text-gray-500 mt-1">Add your first member to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div
                    className="flex items-start space-x-4 flex-1 cursor-pointer"
                    onClick={() => {
                      setSelectedMember(member);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <div className="w-10 h-10 bg-[#d1242a]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-[#d1242a]">
                        {member.full_name.charAt(0)}{member.surname.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900">{member.full_name} {member.surname}</p>
                        {member.membership_number && (
                          <Badge variant="outline" className="text-xs">{member.membership_number}</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" strokeWidth={1.5} />
                          {member.region || 'No region'}
                        </span>
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" strokeWidth={1.5} />
                          {member.phone_number || 'No phone'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Applied: {new Date(member.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                    <Badge
                      variant={member.status === 'approved' ? 'default' : 'secondary'}
                      className={member.status === 'approved' ? 'bg-green-100 text-green-800' : member.status === 'review' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}
                    >
                      {member.status}
                    </Badge>
                    {member.status === 'review' && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApproveMember(member.id)}
                          disabled={actionLoading === member.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          {actionLoading === member.id ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeclineMember(member.id)}
                          disabled={actionLoading === member.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>Membership Application Details</span>
              {selectedMember?.membership_number && (
                <Badge variant="outline">{selectedMember.membership_number}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete application information for {selectedMember?.full_name} {selectedMember?.surname}
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                    <span className="text-xl font-medium text-[#d1242a]">
                      {selectedMember.full_name.charAt(0)}{selectedMember.surname.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedMember.full_name} {selectedMember.surname}</h3>
                    <p className="text-sm text-gray-600">Applied: {new Date(selectedMember.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge
                  variant={selectedMember.status === 'approved' ? 'default' : 'secondary'}
                  className={selectedMember.status === 'approved' ? 'bg-green-100 text-green-800' : selectedMember.status === 'review' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}
                >
                  {selectedMember.status}
                </Badge>
              </div>

              {selectedMember.id_card_photo_url && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Uploaded ID Card
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                    <img
                      src={selectedMember.id_card_photo_url}
                      alt="ID Card"
                      className="w-full h-auto object-contain max-h-64"
                      onClick={() => window.open(selectedMember.id_card_photo_url!, '_blank')}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Click image to view full size</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Personal Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500">ID Number</p>
                      <p className="font-medium">{selectedMember.id_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date of Birth</p>
                      <p className="font-medium">{selectedMember.date_of_birth || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Gender</p>
                      <p className="font-medium capitalize">{selectedMember.gender || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Home Language</p>
                      <p className="font-medium">{selectedMember.home_language || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Occupation</p>
                      <p className="font-medium">{selectedMember.occupation || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{selectedMember.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone Number</p>
                      <p className="font-medium">{selectedMember.phone_number || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Address Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500">Region</p>
                      <p className="font-medium">{selectedMember.region || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Constituency</p>
                      <p className="font-medium">{selectedMember.constituency || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Town/City</p>
                      <p className="font-medium">{selectedMember.town_city || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Village/Suburb</p>
                      <p className="font-medium">{selectedMember.village_suburb || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">PO Box</p>
                      <p className="font-medium">{selectedMember.po_box || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Physical Address</p>
                      <p className="font-medium">{selectedMember.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Briefcase className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Volunteer Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500">Wants to Volunteer</p>
                      <p className="font-medium">{selectedMember.wants_to_volunteer ? 'Yes' : 'No'}</p>
                    </div>
                    {selectedMember.volunteer_interests && selectedMember.volunteer_interests.length > 0 && (
                      <div>
                        <p className="text-gray-500">Volunteer Interests</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedMember.volunteer_interests.map((interest, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{interest}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedMember.volunteer_availability && selectedMember.volunteer_availability.length > 0 && (
                      <div>
                        <p className="text-gray-500">Availability</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedMember.volunteer_availability.map((time, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{time}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">Interested in Leadership</p>
                      <p className="font-medium">{selectedMember.interested_in_leadership ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedMember.status === 'review' && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleDeclineMember(selectedMember.id);
                      setDetailDialogOpen(false);
                    }}
                    disabled={actionLoading === selectedMember.id}
                  >
                    <XCircle className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Decline Application
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleApproveMember(selectedMember.id);
                      setDetailDialogOpen(false);
                    }}
                    disabled={actionLoading === selectedMember.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    {actionLoading === selectedMember.id ? 'Processing...' : 'Approve Application'}
                  </Button>
                </div>
              )}

              {selectedMember.status === 'rejected' && selectedMember.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">Rejection Reason</h4>
                  <p className="text-sm text-red-800">{selectedMember.rejection_reason}</p>
                </div>
              )}

              {selectedMember.status === 'approved' && selectedMember.approved_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Approval Information</h4>
                  <p className="text-sm text-green-800">
                    Approved on {new Date(selectedMember.approved_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Members by Region</CardTitle>
            <CardDescription>Distribution across Namibian regions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="region" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Bar dataKey="members" fill="#d1242a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Age Distribution</CardTitle>
            <CardDescription>Member demographics by age group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {ageData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}