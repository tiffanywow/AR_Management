import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Calendar, DollarSign, Save, UserPlus, ListTodo, X, Upload, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@googlemaps/js-api-loader';

export default function CampaignEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location_name: '',
    location_lat: -22.5597,
    location_lng: 17.0832,
    start_date: '',
    end_date: '',
    target_amount: '',
    raised_amount: '',
    status: 'draft' as 'draft' | 'active' | 'completed' | 'cancelled',
  });

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<{ id?: string; user_id: string; role: string; user_name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id?: string; title: string; description: string; assigned_to: string; due_date: string; priority: string; status: string; assigned_name?: string }[]>([]);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState({ user_id: '', role: 'volunteer' });
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: '', due_date: '', priority: 'medium', status: 'pending' });

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [existingMainImage, setExistingMainImage] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchUsers();
    }
  }, [id]);

  useEffect(() => {
    if (formData.location_lat && formData.location_lng) {
      initMap();
    }
  }, [formData.location_lat, formData.location_lng]);

  const fetchCampaign = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;

      setFormData({
        name: campaignData.name || '',
        description: campaignData.description || '',
        location_name: campaignData.location_name || '',
        location_lat: campaignData.location_lat || -22.5597,
        location_lng: campaignData.location_lng || 17.0832,
        start_date: campaignData.start_date || '',
        end_date: campaignData.end_date || '',
        target_amount: campaignData.target_amount?.toString() || '',
        raised_amount: campaignData.raised_amount?.toString() || '',
        status: campaignData.status || 'draft',
      });

      if (campaignData.image_url) {
        setExistingMainImage(campaignData.image_url);
        setMainImagePreview(campaignData.image_url);
      }

      if (campaignData.gallery_images) {
        setExistingGalleryImages(campaignData.gallery_images);
        setGalleryPreviews(campaignData.gallery_images);
      }

      const { data: collabData, error: collabError } = await supabase
        .from('campaign_collaborators')
        .select('id, user_id, role')
        .eq('campaign_id', id);

      if (collabError) throw collabError;

      const enrichedCollabs = await Promise.all(
        (collabData || []).map(async (collab) => {
          const { data: userData } = await supabase
            .from('memberships')
            .select('full_name, surname')
            .eq('user_id', collab.user_id)
            .maybeSingle();

          return {
            ...collab,
            user_name: userData ? `${userData.full_name} ${userData.surname}` : 'Unknown User',
          };
        })
      );

      setCollaborators(enrichedCollabs);

      const { data: taskData, error: taskError } = await supabase
        .from('campaign_tasks')
        .select('*')
        .eq('campaign_id', id);

      if (taskError) throw taskError;

      const enrichedTasks = await Promise.all(
        (taskData || []).map(async (task) => {
          if (!task.assigned_to) {
            return {
              ...task,
              assigned_name: 'Unassigned',
            };
          }

          const { data: userData } = await supabase
            .from('memberships')
            .select('full_name, surname')
            .eq('user_id', task.assigned_to)
            .maybeSingle();

          return {
            ...task,
            assigned_name: userData ? `${userData.full_name} ${userData.surname}` : 'Unassigned',
          };
        })
      );

      setTasks(enrichedTasks);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign details',
        variant: 'destructive',
      });
      navigate('/campaigns');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, user_id, full_name, surname, email, region')
        .eq('status', 'approved')
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addCollaborator = async () => {
    if (!newCollaborator.user_id) return;

    const user = availableUsers.find(u => u.user_id === newCollaborator.user_id);
    if (!user) return;

    if (collaborators.some(c => c.user_id === newCollaborator.user_id)) {
      toast({
        title: 'Already added',
        description: 'This user is already a collaborator',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('campaign_collaborators')
        .insert({
          campaign_id: id,
          user_id: newCollaborator.user_id,
          role: newCollaborator.role,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCollaborators([...collaborators, {
        ...data,
        user_name: `${user.full_name} ${user.surname}`,
      }]);
      setNewCollaborator({ user_id: '', role: 'volunteer' });
      setShowAddCollaborator(false);

      toast({
        title: 'Collaborator Added',
        description: 'The collaborator has been added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add collaborator',
        variant: 'destructive',
      });
    }
  };

  const removeCollaborator = async (collabId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_collaborators')
        .delete()
        .eq('id', collabId);

      if (error) throw error;

      setCollaborators(collaborators.filter(c => c.id !== collabId));

      toast({
        title: 'Collaborator Removed',
        description: 'The collaborator has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove collaborator',
        variant: 'destructive',
      });
    }
  };

  const addTask = async () => {
    if (!newTask.title) {
      toast({
        title: 'Title required',
        description: 'Please enter a task title',
        variant: 'destructive',
      });
      return;
    }

    try {
      const assignedUser = newTask.assigned_to ? availableUsers.find(u => u.user_id === newTask.assigned_to) : null;

      const { data, error } = await supabase
        .from('campaign_tasks')
        .insert({
          campaign_id: id,
          title: newTask.title,
          description: newTask.description,
          assigned_to: newTask.assigned_to || null,
          due_date: newTask.due_date || null,
          priority: newTask.priority,
          status: newTask.status,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTasks([...tasks, {
        ...data,
        assigned_name: assignedUser ? `${assignedUser.full_name} ${assignedUser.surname}` : 'Unassigned',
      }]);
      setNewTask({ title: '', description: '', assigned_to: '', due_date: '', priority: 'medium', status: 'pending' });
      setShowAddTask(false);

      toast({
        title: 'Task Added',
        description: 'The task has been added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add task',
        variant: 'destructive',
      });
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== taskId));

      toast({
        title: 'Task Removed',
        description: 'The task has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove task',
        variant: 'destructive',
      });
    }
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Image must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setMainImage(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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

    setGalleryImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setGalleryPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeMainImage = () => {
    setMainImage(null);
    setMainImagePreview('');
    setExistingMainImage('');
  };

  const removeGalleryImage = (index: number) => {
    if (index < existingGalleryImages.length) {
      setExistingGalleryImages(prev => prev.filter((_, i) => i !== index));
    } else {
      const newIndex = index - existingGalleryImages.length;
      setGalleryImages(prev => prev.filter((_, i) => i !== newIndex));
    }
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (campaignId: string) => {
    const uploadedUrls: string[] = [...existingGalleryImages];
    let mainImageUrl: string | null = existingMainImage || null;

    if (mainImage) {
      const fileExt = mainImage.name.split('.').pop();
      const fileName = `${campaignId}/main-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(fileName, mainImage);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(fileName);

      mainImageUrl = urlData.publicUrl;
    }

    for (const image of galleryImages) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${campaignId}/gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return { mainImageUrl, galleryUrls: uploadedUrls };
  };

  const initMap = async () => {
    try {
      if (!window.google) {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
        });
        await loader.load();
      }

      if (mapRef.current) {
        const center = { lat: formData.location_lat, lng: formData.location_lng };

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: center,
          zoom: 14,
          mapTypeControl: false,
        });

        const markerInstance = new google.maps.Marker({
          position: center,
          map: mapInstance,
          draggable: true,
        });

        markerInstance.addListener('dragend', () => {
          const position = markerInstance.getPosition();
          if (position) {
            setFormData(prev => ({
              ...prev,
              location_lat: position.lat(),
              location_lng: position.lng(),
            }));

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: position }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setFormData(prev => ({
                  ...prev,
                  location_name: results[0].formatted_address,
                }));
              }
            });
          }
        });

        mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            markerInstance.setPosition(e.latLng);
            setFormData(prev => ({
              ...prev,
              location_lat: e.latLng!.lat(),
              location_lng: e.latLng!.lng(),
            }));

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: e.latLng }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setFormData(prev => ({
                  ...prev,
                  location_name: results[0].formatted_address,
                }));
              }
            });
          }
        });

        setMap(mapInstance);
        setMarker(markerInstance);
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  };

  const searchLocation = () => {
    if (!formData.location_name || !map || !marker) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: formData.location_name }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        map.setCenter(location);
        map.setZoom(14);
        marker.setPosition(location);
        setFormData(prev => ({
          ...prev,
          location_lat: location.lat(),
          location_lng: location.lng(),
          location_name: results[0].formatted_address,
        }));
      } else {
        toast({
          title: 'Location not found',
          description: 'Please try a different search term',
          variant: 'destructive',
        });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setSaving(true);

    try {
      if (mainImage || galleryImages.length > 0) {
        setUploadingImages(true);
        const { mainImageUrl, galleryUrls } = await uploadImages(id);

        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            name: formData.name,
            description: formData.description,
            location_name: formData.location_name,
            location_lat: formData.location_lat,
            location_lng: formData.location_lng,
            start_date: formData.start_date,
            end_date: formData.end_date,
            target_amount: parseFloat(formData.target_amount),
            raised_amount: parseFloat(formData.raised_amount),
            status: formData.status,
            image_url: mainImageUrl,
            gallery_images: galleryUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
        setUploadingImages(false);
      } else {
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            name: formData.name,
            description: formData.description,
            location_name: formData.location_name,
            location_lat: formData.location_lat,
            location_lng: formData.location_lng,
            start_date: formData.start_date,
            end_date: formData.end_date,
            target_amount: parseFloat(formData.target_amount),
            raised_amount: parseFloat(formData.raised_amount),
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Campaign Updated',
        description: 'Your campaign has been updated successfully',
      });

      navigate(`/campaigns/${id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update campaign',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading campaign...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Campaign</h1>
          <p className="text-gray-600 font-light">Update campaign details and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Campaign Details</CardTitle>
                <CardDescription>Basic information about the campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Youth Rally 2024"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the campaign objectives and activities"
                    className="min-h-24"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'active' | 'completed' | 'cancelled') => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">
                      <Calendar className="inline h-4 w-4 mr-1" strokeWidth={1.5} />
                      Start Date
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">
                      <Calendar className="inline h-4 w-4 mr-1" strokeWidth={1.5} />
                      End Date
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_amount">
                      <DollarSign className="inline h-4 w-4 mr-1" strokeWidth={1.5} />
                      Target Amount (N$)
                    </Label>
                    <Input
                      id="target_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.target_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="raised_amount">
                      <DollarSign className="inline h-4 w-4 mr-1" strokeWidth={1.5} />
                      Raised Amount (N$)
                    </Label>
                    <Input
                      id="raised_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.raised_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, raised_amount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  <ImageIcon className="inline h-5 w-5 mr-2" strokeWidth={1.5} />
                  Campaign Images
                </CardTitle>
                <CardDescription>Upload images to showcase your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="main-image">Main Campaign Image</Label>
                  <div className="flex flex-col gap-4">
                    {mainImagePreview ? (
                      <div className="relative">
                        <img
                          src={mainImagePreview}
                          alt="Main campaign preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={removeMainImage}
                        >
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-10 w-10 text-gray-400 mb-3" strokeWidth={1.5} />
                          <p className="text-sm text-gray-600">Click to upload main image</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP or GIF (max 5MB)</p>
                        </div>
                        <input
                          id="main-image"
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={handleMainImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gallery-images">Gallery Images (Optional)</Label>
                  <div className="space-y-4">
                    {galleryPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {galleryPreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Gallery preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removeGalleryImage(index)}
                            >
                              <X className="h-3 w-3" strokeWidth={1.5} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" strokeWidth={1.5} />
                        <p className="text-sm text-gray-600">Add more images</p>
                        <p className="text-xs text-gray-500 mt-1">Multiple files allowed</p>
                      </div>
                      <input
                        id="gallery-images"
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        multiple
                        onChange={handleGalleryImagesChange}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  <MapPin className="inline h-5 w-5 mr-2" strokeWidth={1.5} />
                  Campaign Location
                </CardTitle>
                <CardDescription>Select where the campaign will take place</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location_name">Location</Label>
                  <div className="flex gap-2">
                    <Input
                      id="location_name"
                      placeholder="Search for a location"
                      value={formData.location_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                    />
                    <Button type="button" onClick={searchLocation} variant="outline">
                      Search
                    </Button>
                  </div>
                </div>

                <div ref={mapRef} className="w-full h-96 rounded-lg border border-gray-200" />

                <p className="text-xs text-gray-500">
                  Click on the map or drag the marker to set the exact location
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Latitude:</span>
                    <span className="ml-2 font-medium">{formData.location_lat.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Longitude:</span>
                    <span className="ml-2 font-medium">{formData.location_lng.toFixed(6)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Team & Task Management</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center justify-between">
                <span>
                  <UserPlus className="inline h-5 w-5 mr-2" strokeWidth={1.5} />
                  Collaborators
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCollaborator(!showAddCollaborator)}
                >
                  <UserPlus className="h-4 w-4 mr-1" strokeWidth={1.5} />
                  Add
                </Button>
              </CardTitle>
              <CardDescription>Add team members to collaborate on this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddCollaborator && (
                <div className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select
                      value={newCollaborator.user_id}
                      onValueChange={(value) => setNewCollaborator({ ...newCollaborator, user_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.user_id}>
                            {u.full_name} {u.surname} ({u.region || 'No region'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={newCollaborator.role}
                      onValueChange={(value) => setNewCollaborator({ ...newCollaborator, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="advisor">Advisor</SelectItem>
                        <SelectItem value="logistics">Logistics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={addCollaborator}>
                      Add Collaborator
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddCollaborator(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {collaborators.length === 0 && !showAddCollaborator && (
                <p className="text-sm text-gray-500 text-center py-4">No collaborators added yet</p>
              )}

              {collaborators.length > 0 && (
                <div className="space-y-2">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{collab.user_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{collab.role}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => collab.id && removeCollaborator(collab.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <X className="h-5 w-5" strokeWidth={1.5} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center justify-between">
                <span>
                  <ListTodo className="inline h-5 w-5 mr-2" strokeWidth={1.5} />
                  Tasks
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddTask(!showAddTask)}
                >
                  <ListTodo className="h-4 w-4 mr-1" strokeWidth={1.5} />
                  Add
                </Button>
              </CardTitle>
              <CardDescription>Assign tasks to team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddTask && (
                <div className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                  <div className="space-y-2">
                    <Label>Task Title</Label>
                    <Input
                      placeholder="e.g., Prepare venue"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Task details"
                      className="min-h-20"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select
                        value={newTask.assigned_to}
                        onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((u) => (
                            <SelectItem key={u.id} value={u.user_id}>
                              {u.full_name} {u.surname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={addTask}>
                      Add Task
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddTask(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {tasks.length === 0 && !showAddTask && (
                <p className="text-sm text-gray-500 text-center py-4">No tasks added yet</p>
              )}

              {tasks.length > 0 && (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>Assigned: {task.assigned_name}</span>
                          {task.due_date && <span>Due: {task.due_date}</span>}
                          <span className="capitalize">Priority: {task.priority}</span>
                          <span className="capitalize">Status: {task.status}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => task.id && removeTask(task.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                      >
                        <X className="h-5 w-5" strokeWidth={1.5} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <Button type="button" variant="outline" onClick={() => navigate(`/campaigns/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#d1242a] hover:bg-[#b91c1c]" disabled={saving || uploadingImages}>
            <Save className="mr-2 h-4 w-4" strokeWidth={1.5} />
            {uploadingImages ? 'Uploading Images...' : saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
