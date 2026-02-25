import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Plus, Eye, Edit, Trash2, Image, Video, FileText, List, Play, Pause, Calendar, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendRoleNotification } from '@/lib/notificationTriggers';

interface Advert {
  id: string;
  title: string;
  format: string;
  content_type: string;
  media_urls: string[] | null;
  text_content: string | null;
  cta_type: string | null;
  cta_value: string | null;
  cta_text: string | null;
  duration_seconds: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  impressions: number | null;
  clicks: number | null;
  created_at: string;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'image':
      return Image;
    case 'video':
      return Video;
    case 'text':
      return FileText;
    default:
      return FileText;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function Adverts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'text',
    text_content: '',
    format: 'native',
    cta_type: 'none',
    cta_value: '',
    cta_text: '',
    duration_seconds: 5,
    status: 'active',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchAdverts();
  }, []);

  const fetchAdverts = async () => {
    try {
      const { data, error } = await supabase
        .from('app_adverts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdverts(data || []);
    } catch (error) {
      console.error('Error fetching adverts:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isValid = formData.content_type === 'image' ? isImage : isVideo;

        if (!isValid) {
          toast({
            title: 'Invalid File Type',
            description: `Please upload ${formData.content_type} files only`,
            variant: 'destructive',
          });
        }

        if (file.size > 10485760) {
          toast({
            title: 'File Too Large',
            description: 'File size must be less than 10MB',
            variant: 'destructive',
          });
          return false;
        }

        return isValid;
      });

      setUploadedFiles(validFiles);
    }
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('adverts-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('adverts-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAdvert = async () => {
    if (!user || !formData.title) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the title',
        variant: 'destructive',
      });
      return;
    }

    if (formData.content_type === 'text' && !formData.text_content) {
      toast({
        title: 'Missing Content',
        description: 'Please enter text content',
        variant: 'destructive',
      });
      return;
    }

    if ((formData.content_type === 'image' || formData.content_type === 'video') && uploadedFiles.length === 0) {
      toast({
        title: 'Missing Media',
        description: `Please upload ${formData.content_type} file(s)`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let mediaUrls: string[] = [];

      if (uploadedFiles.length > 0) {
        mediaUrls = await uploadFiles();
      }

      const advertStatus = formData.start_date ? 'scheduled' : formData.status;

      const { error } = await supabase.from('app_adverts').insert([{
        title: formData.title,
        format: formData.format,
        content_type: formData.content_type,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        text_content: formData.content_type === 'text' ? formData.text_content : null,
        cta_type: formData.cta_type,
        cta_value: formData.cta_value || null,
        cta_text: formData.cta_text || null,
        duration_seconds: formData.format === 'interstitial' ? formData.duration_seconds : null,
        status: advertStatus,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        impressions: 0,
        clicks: 0,
        created_by: user.id,
      }]);

      if (error) throw error;

      toast({
        title: 'Advert Created',
        description: `Your advertisement has been ${advertStatus === 'scheduled' ? 'scheduled' : 'created'} successfully`,
      });

      await sendRoleNotification({
        roles: ['super_admin', 'administrator', 'communications_officer'],
        type: 'advert_created',
        title: 'New Advert Created',
        message: `An advertisement "${formData.title}" has been created.`,
      });

      setDialogOpen(false);
      setFormData({
        title: '',
        content_type: 'text',
        text_content: '',
        format: 'native',
        cta_type: 'none',
        cta_value: '',
        cta_text: '',
        duration_seconds: 5,
        status: 'active',
        start_date: '',
        end_date: '',
      });
      setUploadedFiles([]);

      fetchAdverts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create advert',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('app_adverts')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Advert is now ${newStatus}`,
      });

      await sendRoleNotification({
        roles: ['super_admin', 'administrator', 'communications_officer'],
        type: 'advert_status_changed',
        title: 'Advert Status Changed',
        message: `An advertisement status has been changed to ${newStatus}.`,
      });

      fetchAdverts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAdvert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('app_adverts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Advert Deleted',
        description: 'Advertisement has been removed',
      });

      await sendRoleNotification({
        roles: ['super_admin', 'administrator', 'communications_officer'],
        type: 'advert_deleted',
        title: 'Advert Deleted',
        message: `An advertisement has been deleted.`,
      });

      fetchAdverts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete advert',
        variant: 'destructive',
      });
    }
  };

  const totalImpressions = adverts.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0);
  const totalClicks = adverts.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Adverts</h1>
          <p className="text-gray-600 font-light">Manage advertisements for your mobile app</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#d1242a] hover:bg-[#b91c1c]">
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create Advert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Advertisement</DialogTitle>
              <DialogDescription>Create a new advertisement for the mobile app</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Enter advert title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>Ad Placement</Label>
                <p className="text-sm text-gray-600 font-light">Select where this ad should appear in the app</p>
                <div className="grid grid-cols-1 gap-3">
                  <div
                    className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.format === 'native'
                        ? 'border-[#d1242a] bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setFormData({ ...formData, format: 'native' })}
                  >
                    <div className="mt-0.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.format === 'native' ? 'border-[#d1242a]' : 'border-gray-300'
                        }`}>
                        {formData.format === 'native' && (
                          <div className="w-3 h-3 rounded-full bg-[#d1242a]" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <List className="h-4 w-4 text-[#d1242a]" strokeWidth={1.5} />
                        <span className="font-medium">In-Feed</span>
                      </div>
                      <p className="text-sm text-gray-600 font-light">
                        Appears naturally within the app's content feed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.content_type === 'text' && (
                <div className="space-y-2">
                  <Label>Text Content</Label>
                  <Textarea
                    placeholder="Enter your advertisement text"
                    className="min-h-24"
                    value={formData.text_content}
                    onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  />
                </div>
              )}

              {(formData.content_type === 'image' || formData.content_type === 'video') && (
                <div className="space-y-2">
                  <Label>Upload {formData.content_type === 'image' ? 'Image' : 'Video'}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#d1242a] transition-colors">
                    <input
                      type="file"
                      accept={formData.content_type === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      multiple={formData.content_type === 'image'}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-gray-900">
                        Click to upload {formData.content_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.content_type === 'image' ? 'JPG, PNG, GIF, WebP' : 'MP4, MOV, WebM'} up to 10MB
                      </p>
                    </label>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            <X className="h-5 w-5" strokeWidth={1.5} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Label>Schedule & Status</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-light">Start Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-light">End Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                {!formData.start_date && (
                  <div className="space-y-2">
                    <Label className="text-sm font-light">Initial Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (Go Live Immediately)</SelectItem>
                        <SelectItem value="paused">Paused (Create but don't show)</SelectItem>
                        <SelectItem value="draft">Draft (Save for later)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.start_date && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    This ad will be scheduled and go live automatically on {new Date(formData.start_date).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Call to Action</Label>
                <Select
                  value={formData.cta_type}
                  onValueChange={(value) => setFormData({ ...formData, cta_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Action</SelectItem>
                    <SelectItem value="website">Open Website</SelectItem>
                    <SelectItem value="phone">Call Phone</SelectItem>
                    <SelectItem value="app_link">Open App Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.cta_type !== 'none' && (
                <>
                  <div className="space-y-2">
                    <Label>
                      {formData.cta_type === 'website' && 'Website URL'}
                      {formData.cta_type === 'phone' && 'Phone Number'}
                      {formData.cta_type === 'app_link' && 'App Link'}
                    </Label>
                    <Input
                      type={formData.cta_type === 'phone' ? 'tel' : 'text'}
                      placeholder={
                        formData.cta_type === 'website' ? 'https://example.com' :
                          formData.cta_type === 'phone' ? '+264 81 123 4567' :
                            'myapp://path'
                      }
                      value={formData.cta_value}
                      onChange={(e) => setFormData({ ...formData, cta_value: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      placeholder="Learn More"
                      value={formData.cta_text}
                      onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    />
                  </div>
                </>
              )}

              <Button
                className="w-full bg-[#d1242a] hover:bg-[#b91c1c]"
                onClick={handleCreateAdvert}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Advert'}
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
                <p className="text-sm font-light text-gray-600">Total Impressions</p>
                <p className="text-2xl font-semibold text-gray-900">{totalImpressions.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-[#d1242a]" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Total Clicks</p>
                <p className="text-2xl font-semibold text-gray-900">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-[#d1242a] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">↗</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-light text-gray-600">Click Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{avgCTR}%</p>
              </div>
              <div className="w-8 h-8 bg-[#d1242a]/10 rounded-lg flex items-center justify-center">
                <span className="text-[#d1242a] text-sm font-medium">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">Upload New Content</CardTitle>
              <CardDescription>Add images, videos, or text content for app advertisements</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#d1242a] transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">Upload Advertisement Content</h3>
              <p className="text-sm text-gray-600 font-light">
                Create a new advertisement with images, videos, or text
              </p>
              <p className="text-xs text-gray-500">
                Supports: JPG, PNG, MP4, MOV up to 10MB
              </p>
            </div>
            <Button
              className="mt-4 bg-[#d1242a] hover:bg-[#b91c1c]"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create Advert
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Advertisement Library</CardTitle>
          <CardDescription>Manage your existing advertisements</CardDescription>
        </CardHeader>
        <CardContent>
          {adverts.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-gray-600">No advertisements yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first advert to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {adverts.map((ad) => {
                const TypeIcon = getTypeIcon(ad.content_type);
                return (
                  <div key={ad.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#d1242a]/10 rounded-lg flex items-center justify-center">
                        <TypeIcon className="h-6 w-6 text-[#d1242a]" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{ad.title}</h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 font-light">
                          <span>Type: {ad.content_type}</span>
                          <span>Placement: In-Feed</span>
                          <span>Created: {new Date(ad.created_at).toLocaleDateString()}</span>
                        </div>
                        {ad.text_content && (
                          <p className="text-xs text-gray-500 mt-1 max-w-md truncate">{ad.text_content}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{Number(ad.impressions || 0).toLocaleString()}</span> impressions
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{Number(ad.clicks || 0).toLocaleString()}</span> clicks
                        </div>
                      </div>

                      <Badge className={getStatusColor(ad.status)}>
                        {ad.status}
                      </Badge>

                      <div className="flex items-center space-x-2">
                        {ad.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(ad.id, 'paused')}
                            title="Pause advert"
                          >
                            <Pause className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        )}
                        {ad.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(ad.id, 'active')}
                            title="Resume advert"
                          >
                            <Play className="h-4 w-4 text-green-600" strokeWidth={1.5} />
                          </Button>
                        )}
                        {ad.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(ad.id, 'active')}
                            title="Activate advert"
                          >
                            <Play className="h-4 w-4 text-green-600" strokeWidth={1.5} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-gray-100 hover:bg-gray-200"
                          onClick={() => handleDeleteAdvert(ad.id)}
                          title="Delete advert"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}