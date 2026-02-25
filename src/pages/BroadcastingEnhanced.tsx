import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Heart, Calendar, Image as ImageIcon, FileText, Link, Send, Users, Filter, Upload, X, Trash2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendRoleNotification } from '@/lib/notificationTriggers';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Broadcast {
  id: string;
  content: string;
  published_at: string | null;
  scheduled_for: string | null;
  status: string;
  target_type?: string;
  target_demographics?: any;
  like_count: number;
  has_attachments?: boolean;
  media_urls: string[];
  document_urls: string[];
  created_at: string;
  created_by: string;
}

interface BroadcastWithAttachments extends Broadcast {
  attachments?: BroadcastAttachment[];
  creator?: { full_name: string };
  comment_count?: number;
  reaction_count?: number;
  comments?: Comment[];
  reactions?: Reaction[];
}

interface Comment {
  id: string;
  broadcast_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string } | { full_name: string }[];
}

interface Reaction {
  id: string;
  broadcast_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

interface BroadcastAttachment {
  id: string;
  broadcast_id: string;
  attachment_type: string;
  file_url: string | null;
  file_name: string | null;
  campaign_id: string | null;
  campaign?: { name: string };
}

const REGIONS = [
  'All Regions', 'Khomas', 'Erongo', 'Hardap', 'Kharas', 'Kavango East', 'Kavango West',
  'Kunene', 'Ohangwena', 'Omaheke', 'Omusati', 'Oshana', 'Oshikoto', 'Otjozondjupa', 'Zambezi'
];

export default function BroadcastingEnhanced() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState<BroadcastWithAttachments[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('compose');

  const [formData, setFormData] = useState({
    content: '',
    target_type: 'all',
    target_regions: [] as string[],
    target_gender: '',
    target_age_min: '',
    target_age_max: '',
    scheduled_for: '',
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [membersByRegion, setMembersByRegion] = useState<Record<string, number>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchBroadcasts();
    fetchCampaigns();
    fetchMemberCounts();
  }, []);

  const fetchMemberCounts = async () => {
    try {
      const { data: members, error } = await supabase
        .from('memberships')
        .select('region')
        .eq('status', 'approved');

      if (error) throw error;

      setTotalMembers(members?.length || 0);

      const regionCounts: Record<string, number> = {};
      members?.forEach(member => {
        if (member.region) {
          regionCounts[member.region] = (regionCounts[member.region] || 0) + 1;
        }
      });
      setMembersByRegion(regionCounts);
    } catch (error) {
      console.error('Error fetching member counts:', error);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const broadcastIds = (data || []).map(b => b.id);

      let commentsData = { data: [] };
      let reactionsData = { data: [] };

      if (broadcastIds.length > 0) {
        [commentsData, reactionsData] = await Promise.all([
          supabase
            .from('broadcast_comments')
            .select('id, broadcast_id, user_id, content, created_at')
            .in('broadcast_id', broadcastIds)
            .order('created_at', { ascending: true }),
          supabase
            .from('broadcast_reactions')
            .select('id, broadcast_id, user_id, reaction_type, created_at')
            .in('broadcast_id', broadcastIds)
        ]);
      }

      const commentsByBroadcast: Record<string, Comment[]> = {};
      (commentsData.data || []).forEach(comment => {
        if (!commentsByBroadcast[comment.broadcast_id]) {
          commentsByBroadcast[comment.broadcast_id] = [];
        }
        commentsByBroadcast[comment.broadcast_id].push(comment);
      });

      const reactionsByBroadcast: Record<string, Reaction[]> = {};
      (reactionsData.data || []).forEach(reaction => {
        if (!reactionsByBroadcast[reaction.broadcast_id]) {
          reactionsByBroadcast[reaction.broadcast_id] = [];
        }
        reactionsByBroadcast[reaction.broadcast_id].push(reaction);
      });

      const processedData = (data || []).map(broadcast => ({
        ...broadcast,
        media_urls: broadcast.media_urls || [],
        document_urls: broadcast.document_urls || [],
        like_count: broadcast.like_count || 0,
        comments: commentsByBroadcast[broadcast.id] || [],
        comment_count: (commentsByBroadcast[broadcast.id] || []).length,
        reactions: reactionsByBroadcast[broadcast.id] || [],
        reaction_count: (reactionsByBroadcast[broadcast.id] || []).length,
      }));

      setBroadcasts(processedData);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load broadcasts',
        variant: 'destructive',
      });
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const calculateReach = () => {
    if (formData.target_type === 'all') {
      return totalMembers.toLocaleString();
    }
    if (formData.target_type === 'region' && formData.target_regions.length > 0) {
      const count = formData.target_regions.reduce((sum, region) => {
        return sum + (membersByRegion[region] || 0);
      }, 0);
      return count.toLocaleString();
    }
    if (formData.target_type === 'gender' && formData.target_gender) {
      return Math.floor(totalMembers / 2).toLocaleString();
    }
    if (formData.target_type === 'age_range') {
      return Math.floor(totalMembers * 0.6).toLocaleString();
    }
    return totalMembers.toLocaleString();
  };

  const uploadMedia = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('broadcast-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('broadcast-media')
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const uploadDocuments = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('broadcast-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('broadcast-media')
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handlePostBroadcast = async () => {
    if (!user || !formData.content.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let mediaUrls: string[] = [];
      let documentUrls: string[] = [];

      if (imageFiles.length > 0) {
        setUploadingMedia(true);
        mediaUrls = await uploadMedia(imageFiles);
      }

      if (documentFiles.length > 0) {
        documentUrls = await uploadDocuments(documentFiles);
      }

      setUploadingMedia(false);

      const targetFilter: any = {};
      if (formData.target_type === 'region') {
        targetFilter.regions = formData.target_regions;
      }
      if (formData.target_gender) {
        targetFilter.gender = formData.target_gender;
      }
      if (formData.target_age_min && formData.target_age_max) {
        targetFilter.age_range = {
          min: parseInt(formData.target_age_min),
          max: parseInt(formData.target_age_max),
        };
      }

      const broadcastData: any = {
        content: formData.content,
        content_type: 'text',
        status: formData.scheduled_for ? 'scheduled' : 'published',
        target_demographics: Object.keys(targetFilter).length > 0 ? targetFilter : null,
        has_attachments: mediaUrls.length > 0 || documentUrls.length > 0,
        media_urls: mediaUrls,
        document_urls: documentUrls,
        created_by: user.id,
      };

      if (formData.scheduled_for) {
        broadcastData.scheduled_for = formData.scheduled_for;
      } else {
        broadcastData.published_at = new Date().toISOString();
      }

      const { data: broadcast, error } = await supabase
        .from('broadcasts')
        .insert([broadcastData])
        .select()
        .single();

      if (error) throw error;

      if (!formData.scheduled_for) {
        await sendRoleNotification({
          roles: ['super_admin', 'administrator', 'communications_officer'],
          type: 'broadcast_published',
          title: 'New Broadcast Published',
          message: 'A new broadcast has been posted to the feed.',
        });
      }

      toast({
        title: formData.scheduled_for ? 'Broadcast Scheduled' : 'Broadcast Posted',
        description: formData.scheduled_for
          ? `Your message will be posted on ${format(new Date(formData.scheduled_for), 'PPp')}`
          : 'Your message has been posted to the feed',
      });

      setFormData({
        content: '',
        target_type: 'all',
        target_regions: [],
        target_gender: '',
        target_age_min: '',
        target_age_max: '',
        scheduled_for: '',
      });
      setImageFiles([]);
      setDocumentFiles([]);
      setSelectedCampaign('');
      setCurrentTab('feed');
      fetchBroadcasts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post broadcast',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  };

  const handlePostComment = async (broadcastId: string) => {
    const commentText = commentInputs[broadcastId]?.trim();
    if (!user || !commentText) {
      toast({
        title: 'Error',
        description: 'Please enter a comment',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingComment(broadcastId);

    try {
      const { error } = await supabase
        .from('broadcast_comments')
        .insert([{
          broadcast_id: broadcastId,
          user_id: user.id,
          content: commentText,
          status: 'published',
        }]);

      if (error) throw error;

      toast({
        title: 'Comment Posted',
        description: 'Your comment has been added',
      });

      setCommentInputs(prev => ({ ...prev, [broadcastId]: '' }));
      fetchBroadcasts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleDeleteBroadcast = async (id: string, mediaUrls?: string[], documentUrls?: string[]) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;

    try {
      if (mediaUrls) {
        for (const url of mediaUrls) {
          const path = url.split('/').slice(-2).join('/');
          await supabase.storage.from('broadcast-media').remove([path]);
        }
      }

      if (documentUrls) {
        for (const url of documentUrls) {
          const path = url.split('/').slice(-2).join('/');
          await supabase.storage.from('broadcast-media').remove([path]);
        }
      }

      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Broadcast Deleted',
        description: 'The broadcast has been removed',
      });

      fetchBroadcasts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete broadcast',
        variant: 'destructive',
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 10MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
    setImageFiles([...imageFiles, ...validFiles]);
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 20MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
    setDocumentFiles([...documentFiles, ...validFiles]);
  };

  const removeImageFile = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const removeDocumentFile = (index: number) => {
    setDocumentFiles(documentFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Broadcasting</h1>
        <p className="text-gray-600 font-light">Post updates and engage with your members</p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="feed">Feed</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            onClick={() => navigate('/broadcasting-sms')}
            className="ml-4"
          >
            <Smartphone className="mr-2 h-4 w-4" strokeWidth={1.5} />
            SMS Campaigns
          </Button>
        </div>

        <TabsContent value="compose" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Compose Broadcast</CardTitle>
              <CardDescription>Share updates with your members via app feed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="What do you want to share with your members?"
                  className="min-h-32"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
                <p className="text-xs text-gray-500 font-light">
                  {formData.content.length} characters
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Attachments (Optional)</h3>

                <div className="space-y-3">
                  <Label className="text-sm font-light">Images</Label>
                  <label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={uploadingMedia}
                      asChild
                    >
                      <span>
                        <ImageIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Upload Images (Max 10MB each)
                      </span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handleImageSelect}
                      disabled={uploadingMedia}
                    />
                  </label>
                  {imageFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {imageFiles.map((file, index) => (
                        <div key={index} className="relative group border rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                            <span className="text-sm text-gray-600 truncate flex-1">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeImageFile(index)}
                              className="h-6 w-6 p-0 bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                              <X className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-light">Documents</Label>
                  <label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={uploadingMedia}
                      asChild
                    >
                      <span>
                        <FileText className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Upload Documents (Max 20MB each)
                      </span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={handleDocumentSelect}
                      disabled={uploadingMedia}
                    />
                  </label>
                  {documentFiles.length > 0 && (
                    <div className="space-y-2">
                      {documentFiles.map((file, index) => (
                        <div key={index} className="relative group border rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                            <span className="text-sm text-gray-600 truncate flex-1">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocumentFile(index)}
                              className="h-6 w-6 p-0 bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                              <X className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-light">Link to Campaign</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Campaign</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {uploadingMedia && (
                  <div className="text-center py-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">Uploading media files...</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Target Audience</h3>

                <div className="space-y-2">
                  <Label className="text-sm font-light">Audience Type</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value) => setFormData({ ...formData, target_type: value, target_regions: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="region">By Region</SelectItem>
                      <SelectItem value="age_range">By Age Range</SelectItem>
                      <SelectItem value="gender">By Gender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.target_type === 'region' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-light">Select Regions</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-60 overflow-y-auto">
                      {REGIONS.filter(r => r !== 'All Regions').map((region) => (
                        <label
                          key={region}
                          className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.target_regions.includes(region)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  target_regions: [...formData.target_regions, region]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  target_regions: formData.target_regions.filter(r => r !== region)
                                });
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="font-light">
                            {region} {membersByRegion[region] ? `(${membersByRegion[region]})` : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                    {formData.target_regions.length > 0 && (
                      <p className="text-xs text-gray-500 font-light">
                        {formData.target_regions.length} region{formData.target_regions.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}

                {formData.target_type === 'gender' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-light">Gender</Label>
                    <Select
                      value={formData.target_gender}
                      onValueChange={(value) => setFormData({ ...formData, target_gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.target_type === 'age_range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-light">Min Age</Label>
                      <Input
                        type="number"
                        placeholder="18"
                        value={formData.target_age_min}
                        onChange={(e) => setFormData({ ...formData, target_age_min: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-light">Max Age</Label>
                      <Input
                        type="number"
                        placeholder="65"
                        value={formData.target_age_max}
                        onChange={(e) => setFormData({ ...formData, target_age_max: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                    <span className="text-sm font-light text-gray-600">Estimated Reach</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{calculateReach()} members</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Schedule (Optional)</h3>
                <div className="space-y-2">
                  <Label className="text-sm font-light">Scheduled Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_for}
                    onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 font-light">
                    Leave empty to post immediately
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentTab('feed')}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#d1242a] hover:bg-[#b91c1c]"
                  onClick={handlePostBroadcast}
                  disabled={loading || !formData.content.trim()}
                >
                  <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {loading ? 'Posting...' : formData.scheduled_for ? 'Schedule' : 'Post Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Broadcast Feed</CardTitle>
                  <CardDescription>Recent posts to your members</CardDescription>
                </div>
                <Button onClick={() => setCurrentTab('compose')} size="sm" className="bg-[#d1242a] hover:bg-[#b91c1c]">
                  <MessageSquare className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  New Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {broadcasts.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-gray-600">No broadcasts yet</p>
                  <p className="text-sm text-gray-500 mt-1 font-light">
                    Create your first post to engage with members
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {broadcasts.map((broadcast) => (
                    <div
                      key={broadcast.id}
                      className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Affirmative repositioning</p>
                            <p className="text-xs text-gray-500 font-light">
                              {broadcast.published_at
                                ? format(new Date(broadcast.published_at), 'PPp')
                                : 'Draft'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBroadcast(broadcast.id, broadcast.media_urls, broadcast.document_urls)}
                          className="bg-gray-100 hover:bg-gray-200"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </div>

                      <p className="text-gray-900 mb-4 whitespace-pre-wrap">{broadcast.content}</p>

                      {broadcast.media_urls && broadcast.media_urls.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          {broadcast.media_urls.map((url, index) => (
                            <img
                              key={index}
                              src={url}
                              alt={`Media ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(url, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      {broadcast.document_urls && broadcast.document_urls.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {broadcast.document_urls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <FileText className="h-5 w-5 text-[#d1242a]" strokeWidth={1.5} />
                              <span className="text-sm text-gray-900 flex-1">Document {index + 1}</span>
                              <Upload className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4" strokeWidth={1.5} />
                            <span className="font-light">{broadcast.reaction_count || 0} reactions</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                            <span className="font-light">{broadcast.comment_count || 0} comments</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {!broadcast.target_demographics && !broadcast.target_type
                              ? 'All Members'
                              : broadcast.target_type
                                ? `Targeted: ${broadcast.target_type}`
                                : 'Targeted'}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Write a comment..."
                            value={commentInputs[broadcast.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [broadcast.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handlePostComment(broadcast.id);
                              }
                            }}
                            disabled={submittingComment === broadcast.id}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handlePostComment(broadcast.id)}
                            disabled={!commentInputs[broadcast.id]?.trim() || submittingComment === broadcast.id}
                            className="bg-[#d1242a] hover:bg-[#b91c1c]"
                          >
                            <Send className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </div>

                        {broadcast.comments && broadcast.comments.length > 0 && (
                          <div className="space-y-3 mt-4">
                            <h4 className="text-sm font-medium text-gray-900">Comments</h4>
                            <div className="space-y-3">
                              {broadcast.comments.slice(0, 3).map((comment) => {
                                const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
                                const userName = profile?.full_name || 'Unknown User';
                                return (
                                  <div key={comment.id} className="flex items-start space-x-3 bg-gray-50 rounded-lg p-3">
                                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-medium text-gray-700">
                                        {userName.charAt(0)}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900">
                                        {userName}
                                      </p>
                                      <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                      <p className="text-xs text-gray-500 mt-1 font-light">
                                        {format(new Date(comment.created_at), 'PPp')}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {broadcast.comments.length > 3 && (
                                <p className="text-xs text-gray-500 font-light text-center">
                                  + {broadcast.comments.length - 3} more comments
                                </p>
                              )}
                            </div>
                          </div>
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
