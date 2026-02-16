import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Calendar, DollarSign, Users, CheckCircle, Clock, AlertCircle, Radio, Upload, Trash2, X, Image as ImageIcon, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Campaign {
  id: string;
  name: string;
  description: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  start_date: string;
  end_date: string;
  target_amount: number;
  raised_amount: number;
  status: string;
  created_at: string;
  image_url: string | null;
  gallery_images: string[] | null;
}

interface Collaborator {
  id: string;
  role: string;
  user_id: string;
  user: {
    full_name: string;
    email: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_user: {
    full_name: string;
  } | null;
}

interface Attendee {
  id: string;
  user_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    phone_number: string | null;
  };
  memberships: {
    full_name: string;
    phone_number: string;
    email: string | null;
  } | null;
}

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [addCollaboratorOpen, setAddCollaboratorOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('member');
  const [addingCollaborator, setAddingCollaborator] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
    }
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);

      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;

      setCampaign(campaignData);

      const { data: collabData, error: collabError } = await supabase
        .from('campaign_collaborators')
        .select(`
          id,
          role,
          user_id,
          profiles!campaign_collaborators_user_id_fkey(full_name, email)
        `)
        .eq('campaign_id', id);

      if (collabError) throw collabError;

      const formattedCollabs = (collabData || []).map((c: any) => ({
        id: c.id,
        role: c.role,
        user_id: c.user_id,
        user: c.profiles || { full_name: 'Unknown', email: 'N/A' }
      }));

      setCollaborators(formattedCollabs);

      const { data: tasksData, error: tasksError } = await supabase
        .from('campaign_tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          profiles!campaign_tasks_assigned_to_fkey(full_name)
        `)
        .eq('campaign_id', id)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;

      const formattedTasks = (tasksData || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        assigned_user: t.profiles || null
      }));

      setTasks(formattedTasks);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('campaign_attendance')
        .select(`
          id,
          user_id,
          created_at
        `)
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });

      if (attendanceError) throw attendanceError;

      const attendeesWithDetails = await Promise.all(
        (attendanceData || []).map(async (a: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone_number')
            .eq('id', a.user_id)
            .maybeSingle();

          const { data: membership } = await supabase
            .from('memberships')
            .select('full_name, email, phone_number')
            .eq('user_id', a.user_id)
            .maybeSingle();

          return {
            id: a.id,
            user_id: a.user_id,
            created_at: a.created_at,
            profiles: profile || { full_name: 'Unknown', email: 'N/A', phone_number: null },
            memberships: membership || null
          };
        })
      );

      setAttendees(attendeesWithDetails);
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" strokeWidth={1.5} />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" strokeWidth={1.5} />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;

      setCampaign({ ...campaign, status: newStatus });

      toast({
        title: 'Status Updated',
        description: `Campaign status changed to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaign_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      toast({
        title: 'Task Updated',
        description: 'Task status has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleBroadcastCampaign = async () => {
    if (!campaign || !user || !broadcastMessage.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a broadcast message',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!membershipData) {
        toast({
          title: 'Error',
          description: 'Membership not found',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('broadcasts').insert([{
        title: `Campaign: ${campaign.name}`,
        content: broadcastMessage,
        target_audience: 'all_members',
        status: 'sent',
        created_by: membershipData.id,
      }]);

      if (error) throw error;

      toast({
        title: 'Broadcast Sent',
        description: 'Campaign has been broadcast to all members',
      });

      setBroadcastDialogOpen(false);
      setBroadcastMessage('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to broadcast campaign',
        variant: 'destructive',
      });
    }
  };

  const handleUploadMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaign) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);

    try {
      if (campaign.image_url) {
        const oldPath = campaign.image_url.split('/').slice(-2).join('/');
        await supabase.storage.from('campaign-images').remove([oldPath]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${campaign.id}/main-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ image_url: urlData.publicUrl })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      setCampaign({ ...campaign, image_url: urlData.publicUrl });

      toast({
        title: 'Image Uploaded',
        description: 'Main campaign image has been updated',
      });

      setImageDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadGalleryImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !campaign) return;

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 5MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${campaign.id}/gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('campaign-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('campaign-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      const newGalleryImages = [...(campaign.gallery_images || []), ...uploadedUrls];

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ gallery_images: newGalleryImages })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      setCampaign({ ...campaign, gallery_images: newGalleryImages });

      toast({
        title: 'Images Uploaded',
        description: `${validFiles.length} image${validFiles.length > 1 ? 's' : ''} added to gallery`,
      });

      setImageDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteMainImage = async () => {
    if (!campaign || !campaign.image_url) return;

    if (!confirm('Are you sure you want to delete the main campaign image?')) return;

    setDeletingImage(true);

    try {
      const imagePath = campaign.image_url.split('/').slice(-2).join('/');
      const { error: deleteError } = await supabase.storage
        .from('campaign-images')
        .remove([imagePath]);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ image_url: null })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      setCampaign({ ...campaign, image_url: null });

      toast({
        title: 'Image Deleted',
        description: 'Main campaign image has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete image',
        variant: 'destructive',
      });
    } finally {
      setDeletingImage(false);
    }
  };

  const handleDeleteGalleryImage = async (imageUrl: string) => {
    if (!campaign || !campaign.gallery_images) return;

    if (!confirm('Are you sure you want to delete this image?')) return;

    setDeletingImage(true);

    try {
      const imagePath = imageUrl.split('/').slice(-2).join('/');
      const { error: deleteError } = await supabase.storage
        .from('campaign-images')
        .remove([imagePath]);

      if (deleteError) throw deleteError;

      const newGalleryImages = campaign.gallery_images.filter(url => url !== imageUrl);

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ gallery_images: newGalleryImages })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      setCampaign({ ...campaign, gallery_images: newGalleryImages });

      toast({
        title: 'Image Deleted',
        description: 'Gallery image has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete image',
        variant: 'destructive',
      });
    } finally {
      setDeletingImage(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      const existingCollaboratorIds = collaborators.map(c => c.user_id);
      const available = (data || []).filter(
        (profile: Profile) => !existingCollaboratorIds.includes(profile.id)
      );

      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddCollaborator = async () => {
    if (!selectedUserId || !campaign || !user) {
      toast({
        title: 'Missing Information',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    setAddingCollaborator(true);

    try {
      const { error } = await supabase
        .from('campaign_collaborators')
        .insert([{
          campaign_id: campaign.id,
          user_id: selectedUserId,
          role: collaboratorRole,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: 'Collaborator Added',
        description: 'User has been added to the campaign',
      });

      setAddCollaboratorOpen(false);
      setSelectedUserId('');
      setCollaboratorRole('member');

      await fetchCampaignDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add collaborator',
        variant: 'destructive',
      });
    } finally {
      setAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;

    try {
      const { error } = await supabase
        .from('campaign_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      toast({
        title: 'Collaborator Removed',
        description: 'User has been removed from the campaign',
      });

      setCollaborators(collaborators.filter(c => c.id !== collaboratorId));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove collaborator',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-600">Loading campaign details...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Campaign not found</p>
          <Button onClick={() => navigate('/campaigns')}>Back to Campaigns</Button>
        </div>
      </div>
    );
  }

  const progress = campaign.target_amount > 0
    ? (Number(campaign.raised_amount) / Number(campaign.target_amount)) * 100
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
            <p className="text-gray-600 font-light mt-1">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={campaign.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
                <Radio className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Broadcast Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Broadcast Campaign</DialogTitle>
                <DialogDescription>
                  Send a broadcast message about this campaign to all members
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Enter your broadcast message..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="min-h-32"
                  />
                </div>
                <Button
                  className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                  onClick={handleBroadcastCampaign}
                >
                  Send Broadcast
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Campaign Images</CardTitle>
            <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Manage Images
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Manage Campaign Images</DialogTitle>
                  <DialogDescription>
                    Upload or delete images for this campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Main Campaign Image</h4>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={uploadingImage}
                          asChild
                        >
                          <span>
                            <Upload className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            {campaign.image_url ? 'Replace Main Image' : 'Upload Main Image'}
                          </span>
                        </Button>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={handleUploadMainImage}
                          disabled={uploadingImage}
                        />
                      </label>
                      {campaign.image_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="bg-gray-100 hover:bg-gray-200"
                          onClick={handleDeleteMainImage}
                          disabled={deletingImage}
                        >
                          <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Gallery Images</h4>
                    <label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={uploadingImage}
                        asChild
                      >
                        <span>
                          <Upload className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Add Gallery Images
                        </span>
                      </Button>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleUploadGalleryImages}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>

                  {uploadingImage && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">Uploading images...</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!campaign.image_url && (!campaign.gallery_images || campaign.gallery_images.length === 0) ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-600 mb-2">No images yet</p>
              <p className="text-sm text-gray-500">Click "Manage Images" to add photos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.image_url && (
                <div className="relative group">
                  <img
                    src={campaign.image_url}
                    alt={campaign.name}
                    className="w-full h-96 object-cover rounded-lg border border-gray-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200"
                    onClick={handleDeleteMainImage}
                    disabled={deletingImage}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              )}
              {campaign.gallery_images && campaign.gallery_images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Gallery</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {campaign.gallery_images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`${campaign.name} gallery ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer"
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200"
                          onClick={() => handleDeleteGalleryImage(imageUrl)}
                          disabled={deletingImage}
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Target Amount</p>
                <p className="text-xl font-semibold text-gray-900">N${Number(campaign.target_amount).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Raised</p>
                <p className="text-xl font-semibold text-green-600">N${Number(campaign.raised_amount).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Attendees</p>
                <p className="text-xl font-semibold text-gray-900">{attendees.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Collaborators</p>
                <p className="text-xl font-semibold text-gray-900">{collaborators.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Tasks</p>
                <p className="text-xl font-semibold text-gray-900">{tasks.length}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Event Attendance</CardTitle>
          <CardDescription>
            {attendees.length} {attendees.length === 1 ? 'person has' : 'people have'} marked attendance for this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendees.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-600">No attendees yet</p>
              <p className="text-sm text-gray-500 mt-1">Members can mark their attendance through the mobile app</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attendees.map((attendee) => {
                const displayName = attendee.memberships?.full_name || attendee.profiles.full_name;
                const displayEmail = attendee.memberships?.email || attendee.profiles.email;
                const displayPhone = attendee.memberships?.phone_number || attendee.profiles.phone_number;

                return (
                  <div key={attendee.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-green-700">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{displayName}</p>
                      {displayEmail && (
                        <p className="text-sm text-gray-600 truncate">{displayEmail}</p>
                      )}
                      {displayPhone && (
                        <p className="text-xs text-gray-500">{displayPhone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Marked {new Date(attendee.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Campaign Progress</CardTitle>
          <CardDescription>Fundraising target and progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>N${Number(campaign.raised_amount).toLocaleString()} raised</span>
              <span>N${(Number(campaign.target_amount) - Number(campaign.raised_amount)).toLocaleString()} remaining</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <div>
                <p className="text-gray-600">Start Date</p>
                <p className="font-medium">{new Date(campaign.start_date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <div>
                <p className="text-gray-600">End Date</p>
                <p className="font-medium">{new Date(campaign.end_date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm col-span-2">
              <MapPin className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
              <div>
                <p className="text-gray-600">Location</p>
                <p className="font-medium">{campaign.location_name}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="collaborators" className="w-full">
        <TabsList>
          <TabsTrigger value="collaborators">Collaborators ({collaborators.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="collaborators">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Team Members</CardTitle>
                  <CardDescription>People working on this campaign</CardDescription>
                </div>
                <Dialog open={addCollaboratorOpen} onOpenChange={(open) => {
                  setAddCollaboratorOpen(open);
                  if (open) fetchAvailableUsers();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#d1242a] hover:bg-[#b91c1c]">
                      <UserPlus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Add Collaborator
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Collaborator</DialogTitle>
                      <DialogDescription>
                        Add a team member to this campaign
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.length === 0 ? (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                No available users
                              </div>
                            ) : (
                              availableUsers.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.full_name} ({profile.email})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={collaboratorRole} onValueChange={setCollaboratorRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coordinator">Coordinator</SelectItem>
                            <SelectItem value="organizer">Organizer</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="volunteer">Volunteer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                        onClick={handleAddCollaborator}
                        disabled={addingCollaborator || !selectedUserId}
                      >
                        {addingCollaborator ? 'Adding...' : 'Add Collaborator'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {collaborators.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-gray-600 mb-3">No collaborators yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddCollaboratorOpen(true);
                      fetchAvailableUsers();
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Add First Collaborator
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {collaborators.map((collab: any) => (
                    <div key={collab.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-[#d1242a]">
                            {collab.user.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{collab.user.full_name}</p>
                          <p className="text-sm text-gray-600">{collab.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {collab.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCollaborator(collab.id)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                        >
                          <X className="h-5 w-5" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Campaign Tasks</CardTitle>
              <CardDescription>Manage tasks assigned to team members</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-gray-600">No tasks yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTaskStatusIcon(task.status)}
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleTaskStatusChange(task.id, value)}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Assigned: {task.assigned_user?.full_name || 'Unassigned'}</span>
                        {task.due_date && (
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
