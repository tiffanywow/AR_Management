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
import { Plus, Users, MessageSquare, BarChart3, UserPlus, Trash2, Crown } from 'lucide-react';
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string; isLeader: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    community_type: 'general',
    privacy_setting: 'public',
  });

  useEffect(() => {
    fetchCommunities();
    fetchAvailableMembers();
  }, []);

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
      // Also fetch the updated community data
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select(`
          *,
          leader:leader_id(id, full_name, surname, phone_number, email)
        `)
        .eq('id', communityId)
        .single();

      if (communityError) throw communityError;

      if (communityData) {
        setSelectedCommunity(communityData);
      }

      // First get community members
      const { data: members, error: membersError } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setCommunityMembers([]);
        return;
      }

      // Then get membership details for those users
      const userIds = members.map(m => m.user_id);
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('id, user_id, full_name, surname, email, region')
        .in('user_id', userIds);

      if (membershipError) throw membershipError;

      // Combine the data and add member_id field (should be memberships.id for leader comparison)
      const enrichedMembers = members.map(member => {
        const membershipInfo = membershipData?.find(m => m.user_id === member.user_id);
        return {
          ...member,
          member_id: membershipInfo?.id || null, // Use memberships.id instead of user_id
          member: membershipInfo || null
        };
      });

      setCommunityMembers(enrichedMembers);
    } catch (error) {
      console.error('Error fetching community members:', error);
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

  const handleAddMemberToCommunity = async (memberId: string) => {
    if (!selectedCommunity || !user) return;

    try {
      const { error } = await supabase.from('community_members').insert([{
        community_id: selectedCommunity.id,
        user_id: memberId,
        role: 'member',
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

      await fetchCommunityMembers(selectedCommunity.id);
      await fetchCommunities();
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

  const handleRemoveMemberClick = (membershipId: string, memberName: string, isLeader: boolean) => {
    setMemberToDelete({ id: membershipId, name: memberName, isLeader });
    setDeleteConfirmOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('id', memberToDelete.id);

      if (error) throw error;

      if (selectedCommunity) {
        await supabase
          .from('communities')
          .update({ member_count: Math.max(0, selectedCommunity.member_count - 1) })
          .eq('id', selectedCommunity.id);
      }

      toast({
        title: 'Member Removed',
        description: `${memberToDelete.name} has been removed from the community`,
      });

      if (selectedCommunity) {
        await fetchCommunityMembers(selectedCommunity.id);
        await fetchCommunities();
      }

      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCommunity = async (communityId: string) => {
    try {
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId);

      if (error) throw error;

      toast({
        title: 'Community Deleted',
        description: 'The community has been removed',
      });

      fetchCommunities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete community',
        variant: 'destructive',
      });
    }
  };

  const handleSetLeader = async (communityId: string, leaderId: string, leaderTitle: string) => {
    try {
      // Get the user_id from the memberships table
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('id', leaderId)
        .single();

      if (membershipError) throw membershipError;

      if (!membershipData) {
        throw new Error('Member not found');
      }

      // Update the community with the leader
      const { error: updateError } = await supabase
        .from('communities')
        .update({
          leader_id: leaderId,
          leader_title: leaderTitle
        })
        .eq('id', communityId);

      if (updateError) throw updateError;

      // Add the leader to community_members if not already a member
      const { error: memberError } = await supabase
        .from('community_members')
        .upsert([{
          community_id: communityId,
          user_id: membershipData.user_id,
          role: 'member',
          invited_by: user?.id
        }], {
          onConflict: 'community_id,user_id',
          ignoreDuplicates: true
        });

      if (memberError && !memberError.message?.includes('duplicate')) {
        throw memberError;
      }

      // Update member count
      const { count } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId);

      if (count !== null) {
        await supabase
          .from('communities')
          .update({ member_count: count })
          .eq('id', communityId);
      }

      toast({
        title: 'Leader Assigned',
        description: 'Community leader has been set successfully',
      });

      await fetchCommunities();

      if (selectedCommunity) {
        await fetchCommunityMembers(selectedCommunity.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set leader',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveLeaderClick = () => {
    if (selectedCommunity?.leader) {
      const leaderName = `${selectedCommunity.leader.full_name} ${selectedCommunity.leader.surname}`.trim();
      setMemberToDelete({
        id: selectedCommunity.id,
        name: leaderName,
        isLeader: true
      });
      setDeleteConfirmOpen(true);
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

      await fetchCommunities();

      if (selectedCommunity) {
        await fetchCommunityMembers(selectedCommunity.id);
      }

      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

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
                    <CardDescription className="text-xs font-light flex items-center gap-2">
                      <span>{community.member_count} members</span>
                      <span>•</span>
                      <span className="capitalize">{community.privacy_setting}</span>
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCommunity(community.id)}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {community.description && (
                <p className="text-sm text-gray-600 font-light line-clamp-2">
                  {community.description}
                </p>
              )}

              {community.leader && community.leader_id && (
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
                      <SelectItem key={member.id} value={member.user_id}>
                        {member.full_name} {member.surname} ({member.region || 'No region'})
                      </SelectItem>
                    ))}
                  {availableMembers.filter(m => !communityMembers.find(cm => cm.user_id === m.user_id)).length === 0 && (
                    <div className="p-2 text-sm text-gray-500 text-center">All members already added</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label>Current Members ({communityMembers.length})</Label>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {communityMembers
                  .sort((a, b) => {
                    const aIsLeader = selectedCommunity?.leader_id === a.member_id;
                    const bIsLeader = selectedCommunity?.leader_id === b.member_id;
                    if (aIsLeader && !bIsLeader) return -1;
                    if (!aIsLeader && bIsLeader) return 1;
                    return 0;
                  })
                  .map((membership) => {
                    const isLeader = selectedCommunity?.leader_id === membership.member_id;
                    const memberName = `${membership.member?.full_name || 'Unknown'} ${membership.member?.surname || ''}`.trim();
                    return (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-[#d1242a]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            {isLeader ? (
                              <Crown className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                            ) : (
                              <span className="text-xs font-medium text-[#d1242a]">
                                {membership.member?.full_name?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900">
                                {memberName}
                              </p>
                              {isLeader && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#d1242a] text-white">
                                  {selectedCommunity?.leader_title || 'Leader'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-light">
                              {membership.member?.region || 'No region'} • {membership.role}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMemberClick(membership.id, memberName, isLeader)}
                          className="bg-gray-100 hover:bg-gray-200 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    );
                  })}
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
                      handleRemoveLeaderClick();
                      setLeaderDialogOpen(false);
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

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToDelete?.isLeader ? 'Remove Community Leader?' : 'Remove Member?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-medium text-gray-900">{memberToDelete?.name}</span> from this community?
              {memberToDelete?.isLeader && ' This will also remove their leader status.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false);
              setMemberToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToDelete?.isLeader && selectedCommunity) {
                  handleRemoveLeader(selectedCommunity.id);
                } else {
                  handleRemoveMember();
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
