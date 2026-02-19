import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Users, MessageSquare, BarChart3, UserPlus, Trash2, Crown, UserCheck, UserX, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Community {
  id: string;
  name: string;
  description: string | null;
  community_type: string | null;
  region: string | null;
  privacy_setting: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  member_count: number;
  status: string | null;
  created_at: string;
  created_by: string | null;
  leader_id: string | null;
  leader_title: string | null;
  leader_contact: string | null;
  leader?: {
    id: string;
    full_name: string;
    surname: string;
    phone_number: string;
    email: string;
  };
}

interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export default function Communities() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false);
  const [selectedLeaderTitle, setSelectedLeaderTitle] = useState('Community Leader');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestsDialogOpen, setRequestsDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string; isLeader: boolean } | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [communityToDelete, setCommunityToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    community_type: 'general',
    privacy_setting: 'public',
  });

  useEffect(() => {
    fetchCommunities();
    fetchAvailableMembers();
    fetchPendingRequests();

    const communitiesChannel = supabase
      .channel('communities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communities'
        },
        () => {
          fetchCommunities();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_members'
        },
        (payload) => {
          fetchCommunities();
          fetchPendingRequests();
          if (selectedCommunity) {
            fetchCommunityMembers(selectedCommunity.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(communitiesChannel);
    };
  }, [selectedCommunity]);

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          leader:leader_id(id, full_name, surname, phone_number, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunities(data || []);
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, user_id, full_name, surname, email, region')
        .eq('status', 'approved')
        .order('full_name');

      if (error) throw error;
      setAvailableMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchCommunityMembers = async (communityId: string) => {
    try {
      const { data: community } = await supabase
        .from('communities')
        .select('leader_id, leader_title')
        .eq('id', communityId)
        .maybeSingle();

      const { data: members, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('status', 'active');

      if (error) throw error;

      let leaderUserId = null;
      if (community?.leader_id) {
        const { data: leaderMembership } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('id', community.leader_id)
          .maybeSingle();

        leaderUserId = leaderMembership?.user_id;
      }

      const membersWithDetails = await Promise.all(
        (members || []).map(async (member) => {
          const { data: membershipData } = await supabase
            .from('memberships')
            .select('id, user_id, full_name, surname, email, region')
            .eq('user_id', member.user_id)
            .maybeSingle();

          return {
            ...member,
            memberships: membershipData,
            isLeader: leaderUserId === member.user_id,
            leaderTitle: community?.leader_title || 'Community Leader'
          };
        })
      );

      if (leaderUserId) {
        const leaderExists = membersWithDetails.some(m => m.user_id === leaderUserId);

        if (!leaderExists) {
          const { data: leaderData } = await supabase
            .from('memberships')
            .select('id, user_id, full_name, surname, email, region')
            .eq('user_id', leaderUserId)
            .maybeSingle();

          if (leaderData) {
            membersWithDetails.unshift({
              id: `leader-${leaderUserId}`,
              community_id: communityId,
              user_id: leaderUserId,
              role: 'member',
              status: 'active',
              joined_at: new Date().toISOString(),
              memberships: leaderData,
              isLeader: true,
              leaderTitle: community.leader_title || 'Community Leader'
            });
          }
        }
      }

      const sortedMembers = membersWithDetails.sort((a, b) => {
        if (a.isLeader) return -1;
        if (b.isLeader) return 1;
        return 0;
      });

      setCommunityMembers(sortedMembers);
    } catch (error) {
      console.error('Error fetching community members:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('community_members')
        .select(`
          *,
          community:community_id(id, name, privacy_setting)
        `)
        .eq('status', 'requested')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const requestsWithDetails = await Promise.all(
        (requests || []).map(async (request) => {
          const { data: membershipData } = await supabase
            .from('memberships')
            .select('id, user_id, full_name, surname, email, phone_number, region')
            .eq('user_id', request.user_id)
            .maybeSingle();

          return {
            ...request,
            memberships: membershipData
          };
        })
      );

      setPendingRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleCreateCommunity = async () => {
    if (!user || !formData.name.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a community name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('communities').insert([{
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        community_type: formData.community_type,
        privacy_setting: formData.privacy_setting,
        status: 'active',
        member_count: 0,
        post_count: 0,
        created_by: user.id,
      }]);

      if (error) throw error;

      toast({
        title: 'Community Created',
        description: 'Your community has been created successfully',
      });

      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        community_type: 'general',
        privacy_setting: 'public',
      });
      fetchCommunities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create community',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberToCommunity = async (membershipId: string) => {
    if (!selectedCommunity || !user) return;

    try {
      const { data: membership } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('id', membershipId)
        .maybeSingle();

      if (!membership) {
        throw new Error('Member not found');
      }

      const { error } = await supabase.from('community_members').insert([{
        community_id: selectedCommunity.id,
        user_id: membership.user_id,
        role: 'member',
        status: 'active',
        invited_by: user.id,
      }]);

      if (error) throw error;

      await supabase
        .from('communities')
        .update({ member_count: selectedCommunity.member_count + 1 })
        .eq('id', selectedCommunity.id);

      toast({
        title: 'Member Added',
        description: 'Member has been added to the community',
      });

      fetchCommunityMembers(selectedCommunity.id);
      fetchCommunities();
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast({
          title: 'Already a Member',
          description: 'This person is already in the community',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to add member',
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemoveMemberClick = (membershipId: string, memberName: string, isLeader: boolean = false) => {
    setMemberToRemove({ id: membershipId, name: memberName, isLeader });
    setRemoveConfirmOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      if (selectedCommunity) {
        const updates: any = {
          member_count: Math.max(0, selectedCommunity.member_count - 1)
        };

        if (memberToRemove.isLeader) {
          updates.leader_membership_id = null;
          updates.leader_title = null;
        }

        await supabase
          .from('communities')
          .update(updates)
          .eq('id', selectedCommunity.id);
      }

      toast({
        title: 'Member Removed',
        description: memberToRemove.isLeader
          ? 'Community leader has been removed from the community'
          : 'Member has been removed from the community',
      });

      if (selectedCommunity) {
        fetchCommunityMembers(selectedCommunity.id);
        fetchCommunities();
      }

      setRemoveConfirmOpen(false);
      setMemberToRemove(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCommunityClick = (communityId: string, communityName: string) => {
    setCommunityToDelete({ id: communityId, name: communityName });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteCommunity = async () => {
    if (!communityToDelete) return;

    try {
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityToDelete.id);

      if (error) throw error;

      toast({
        title: 'Community Deleted',
        description: 'The community has been removed',
      });

      fetchCommunities();
      setDeleteConfirmOpen(false);
      setCommunityToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete community',
        variant: 'destructive',
      });
    }
  };

  const handleSetLeader = async (communityId: string, membershipId: string, leaderTitle: string) => {
    try {
      const { data: membership } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('id', membershipId)
        .maybeSingle();

      if (!membership) {
        throw new Error('Member not found');
      }

      const userId = membership.user_id;

      const { data: existingMember } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      const isNewMember = !existingMember;

      if (isNewMember) {
        const { error: memberError } = await supabase
          .from('community_members')
          .insert({
            community_id: communityId,
            user_id: userId,
            role: 'member',
            status: 'active'
          });

        if (memberError) throw memberError;

        const community = communities.find(c => c.id === communityId);
        if (community) {
          await supabase
            .from('communities')
            .update({ member_count: community.member_count + 1 })
            .eq('id', communityId);
        }
      }

      const { error } = await supabase
        .from('communities')
        .update({
          leader_id: membershipId,
          leader_title: leaderTitle
        })
        .eq('id', communityId);

      if (error) throw error;

      toast({
        title: 'Leader Assigned',
        description: 'Community leader has been set successfully',
      });

      fetchCommunities();
      if (selectedCommunity) {
        fetchCommunityMembers(selectedCommunity.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set leader',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLeader = async (communityId: string) => {
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          leader_id: null,
          leader_title: null
        })
        .eq('id', communityId);

      if (error) throw error;

      toast({
        title: 'Leader Removed',
        description: 'Community leader has been removed',
      });

      fetchCommunities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove leader',
        variant: 'destructive',
      });
    }
  };

  const handleViewMembers = (community: Community) => {
    setSelectedCommunity(community);
    fetchCommunityMembers(community.id);
    setMembersDialogOpen(true);
  };

  const handleOpenLeaderDialog = (community: Community) => {
    setSelectedCommunity(community);
    setSelectedLeaderTitle(community.leader_title || 'Community Leader');
    setLeaderDialogOpen(true);
  };

  const handleApproveRequest = async (requestId: string, communityId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ status: 'active' })
        .eq('id', requestId);

      if (error) throw error;

      const community = communities.find(c => c.id === communityId);
      if (community) {
        await supabase
          .from('communities')
          .update({ member_count: community.member_count + 1 })
          .eq('id', communityId);
      }

      toast({
        title: 'Request Approved',
        description: 'Member has been added to the community',
      });

      fetchPendingRequests();
      fetchCommunities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Declined',
        description: 'The join request has been declined',
      });

      fetchPendingRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline request',
        variant: 'destructive',
      });
    }
  };

  const totalMembers = communities.reduce((sum, c) => sum + c.member_count, 0);
  const activeCommunities = communities.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Communities</h1>
          <p className="text-gray-600 font-light">Create and manage member communities</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create Community
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
              <DialogDescription>Set up a new community for targeted engagement</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Community Name</Label>
                <Input
                  placeholder="e.g., Youth Wing, Women's Network"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What is this community about?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Community Type</Label>
                  <Select
                    value={formData.community_type}
                    onValueChange={(value) => setFormData({ ...formData, community_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="youth">Youth</SelectItem>
                      <SelectItem value="women">Women</SelectItem>
                      <SelectItem value="special_interest">Special Interest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Privacy</Label>
                  <Select
                    value={formData.privacy_setting}
                    onValueChange={(value) => setFormData({ ...formData, privacy_setting: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                onClick={handleCreateCommunity}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Community'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Communities</p>
                <p className="text-2xl font-semibold text-gray-900">{communities.length}</p>
              </div>
              <Users className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Members</p>
                <p className="text-2xl font-semibold text-gray-900">{totalMembers.toLocaleString()}</p>
              </div>
              <UserPlus className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Active Groups</p>
                <p className="text-2xl font-semibold text-gray-900">{activeCommunities}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setRequestsDialogOpen(true)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Pending Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingRequests.length}</p>
              </div>
              <Clock className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingRequests.length > 0 && (
        <Card className="border-[#d1242a]/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                <CardTitle className="text-lg">Pending Join Requests</CardTitle>
              </div>
              <Badge variant="destructive" className="bg-[#d1242a]">
                {pendingRequests.length}
              </Badge>
            </div>
            <CardDescription>Review and approve community join requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.memberships?.full_name || 'Unknown'} {request.memberships?.surname || ''}
                      </p>
                      <p className="text-xs text-gray-600 font-light">
                        wants to join <span className="font-medium">{request.community?.name}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.memberships?.region || 'No region'} • {request.memberships?.phone_number || 'No phone'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveRequest(request.id, request.community_id)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <UserCheck className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineRequest(request.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      <UserX className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
              {pendingRequests.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setRequestsDialogOpen(true)}
                >
                  View All {pendingRequests.length} Requests
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map((community) => (
          <Card key={community.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#d1242a]/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-[#d1242a]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-medium">{community.name}</CardTitle>
                    <CardDescription className="text-xs font-light">
                      {community.member_count} members
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCommunityClick(community.id, community.name)}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {community.description && (
                <p className="text-sm text-gray-600 font-light line-clamp-2">
                  {community.description}
                </p>
              )}

              {community.leader && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                    <p className="text-xs font-medium text-gray-700">{community.leader_title || 'Community Leader'}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {community.leader.full_name} {community.leader.surname}
                  </p>
                  {community.leader.phone_number && (
                    <p className="text-xs text-gray-600">{community.leader.phone_number}</p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewMembers(community)}
                >
                  <Users className="mr-2 h-3 w-3" strokeWidth={1.5} />
                  Members
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenLeaderDialog(community)}
                >
                  <Crown className="mr-2 h-3 w-3" strokeWidth={1.5} />
                  Leader
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#d1242a] hover:bg-[#b91c1c]"
                >
                  <MessageSquare className="mr-2 h-3 w-3" strokeWidth={1.5} />
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {communities.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-gray-600">No communities yet</p>
            <p className="text-sm text-gray-500 mt-1 font-light">Create your first community to organize members</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCommunity?.name} Members</DialogTitle>
            <DialogDescription>Manage members in this community</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Member</Label>
              <Select onValueChange={handleAddMemberToCommunity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers
                    .filter(m => !communityMembers.find(cm => cm.user_id === m.user_id))
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name} {member.surname} ({member.region || 'No region'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label>Current Members ({communityMembers.length})</Label>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {communityMembers.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-[#d1242a]">
                          {membership.memberships?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {membership.memberships?.full_name || 'Unknown'} {membership.memberships?.surname || ''}
                          </p>
                          {membership.isLeader && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-[#d1242a] text-white rounded-full flex items-center gap-1">
                              <Crown className="h-3 w-3" strokeWidth={2} />
                              {membership.leaderTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-light">
                          {membership.memberships?.region || 'No region'} • {membership.role}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMemberClick(
                        membership.id,
                        `${membership.memberships?.full_name || 'Unknown'} ${membership.memberships?.surname || ''}`,
                        membership.isLeader
                      )}
                      className="bg-gray-100 hover:bg-gray-200"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                ))}
                {communityMembers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8 font-light">
                    No members yet. Add members using the dropdown above.
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={leaderDialogOpen} onOpenChange={setLeaderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Community Leader</DialogTitle>
            <DialogDescription>Assign a leader for {selectedCommunity?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCommunity?.leader && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                    <p className="text-sm font-medium">Current Leader</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedCommunity) {
                        handleRemoveLeader(selectedCommunity.id);
                        setLeaderDialogOpen(false);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedCommunity.leader.full_name} {selectedCommunity.leader.surname}
                </p>
                <p className="text-xs text-gray-600">{selectedCommunity.leader_title || 'Community Leader'}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Leader Title <span className="text-xs text-gray-500">(Add custom title)</span></Label>
              <Input
                value={selectedLeaderTitle}
                onChange={(e) => setSelectedLeaderTitle(e.target.value)}
                placeholder="e.g., Chairman, Coordinator, President"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Select Member as Leader</Label>
              <Select
                onValueChange={(memberId) => {
                  if (selectedCommunity) {
                    handleSetLeader(selectedCommunity.id, memberId, selectedLeaderTitle);
                    setLeaderDialogOpen(false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} {member.surname} ({member.region || 'No region'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestsDialogOpen} onOpenChange={setRequestsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Pending Join Requests</DialogTitle>
            <DialogDescription>
              {pendingRequests.length} {pendingRequests.length === 1 ? 'member' : 'members'} waiting for approval
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-gray-600">No pending requests</p>
                <p className="text-sm text-gray-500 mt-1 font-light">
                  All join requests have been processed
                </p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {request.memberships?.full_name || 'Unknown'} {request.memberships?.surname || ''}
                      </p>
                      <p className="text-xs text-gray-600 font-light">
                        wants to join <span className="font-medium">{request.community?.name}</span>
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {request.memberships?.region || 'No region'}
                        </p>
                        {request.memberships?.phone_number && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-500">
                              {request.memberships.phone_number}
                            </p>
                          </>
                        )}
                        {request.memberships?.email && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-500">
                              {request.memberships.email}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveRequest(request.id, request.community_id)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <UserCheck className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineRequest(request.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      <UserX className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToRemove?.isLeader ? 'Remove Community Leader?' : 'Remove Member from Community?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-medium text-gray-900">{memberToRemove?.name}</span> from this community?
              {memberToRemove?.isLeader && (
                <span className="block mt-2 text-amber-600 font-medium">
                  This member is currently the community leader. Removing them will also clear the leader assignment.
                </span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-[#d1242a] hover:bg-[#b01f24]"
            >
              Remove {memberToRemove?.isLeader ? 'Leader' : 'Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-gray-900">{communityToDelete?.name}</span>?
              This will remove all members and community data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCommunityToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCommunity}
              className="bg-[#d1242a] hover:bg-[#b01f24]"
            >
              Delete Community
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
