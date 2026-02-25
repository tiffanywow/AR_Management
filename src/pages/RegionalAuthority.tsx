import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, MapPin, Users, Map } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RegionalAuthorityMap from '@/components/RegionalAuthorityMap';
import LocationPicker from '@/components/LocationPicker';
import { sendRoleNotification } from '@/lib/notificationTriggers';

interface RegionalAuthority {
  id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface Constituency {
  id: string;
  regional_authority_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface Candidate {
  id: string;
  full_name: string;
  bio: string | null;
  photo_url: string | null;
  position: string | null;
  party_affiliation: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  regional_authority_id?: string;
  constituency_id?: string;
}

export default function RegionalAuthority() {
  const [authorities, setAuthorities] = useState<RegionalAuthority[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [regionalCandidates, setRegionalCandidates] = useState<Candidate[]>([]);
  const [constituencyCandidates, setConstituencyCandidates] = useState<Candidate[]>([]);
  const [selectedAuthority, setSelectedAuthority] = useState<string | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<string | null>(null);

  const [showAuthorityDialog, setShowAuthorityDialog] = useState(false);
  const [showConstituencyDialog, setShowConstituencyDialog] = useState(false);
  const [showRegionalCandidateDialog, setShowRegionalCandidateDialog] = useState(false);
  const [showConstituencyCandidateDialog, setShowConstituencyCandidateDialog] = useState(false);

  const [editingAuthority, setEditingAuthority] = useState<RegionalAuthority | null>(null);
  const [editingConstituency, setEditingConstituency] = useState<Constituency | null>(null);
  const [editingRegionalCandidate, setEditingRegionalCandidate] = useState<Candidate | null>(null);
  const [editingConstituencyCandidate, setEditingConstituencyCandidate] = useState<Candidate | null>(null);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    locationName: string;
  } | null>(null);
  const [candidatesByAuthority, setCandidatesByAuthority] = useState<Record<string, Candidate[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAuthorities();
  }, []);

  useEffect(() => {
    fetchAllCandidates();
  }, [authorities.length]);

  useEffect(() => {
    if (selectedAuthority) {
      fetchConstituencies(selectedAuthority);
      fetchRegionalCandidates(selectedAuthority);
    }
  }, [selectedAuthority]);

  useEffect(() => {
    if (selectedConstituency) {
      fetchConstituencyCandidates(selectedConstituency);
    }
  }, [selectedConstituency]);

  const fetchAuthorities = async () => {
    try {
      const { data, error } = await supabase
        .from('regional_authorities')
        .select('*')
        .order('name');

      if (error) throw error;
      setAuthorities(data || []);
    } catch (error: any) {
      toast.error('Error fetching regional authorities: ' + error.message);
    }
  };

  const fetchAllCandidates = async () => {
    if (authorities.length === 0) return;

    try {
      const candidatesMap: Record<string, Candidate[]> = {};

      const authorityIds = authorities.map(a => a.id);

      const { data, error } = await supabase
        .from('regional_authority_candidates')
        .select('*')
        .in('regional_authority_id', authorityIds)
        .eq('is_active', true)
        .order('full_name');

      if (!error && data) {
        data.forEach(candidate => {
          if (!candidatesMap[candidate.regional_authority_id]) {
            candidatesMap[candidate.regional_authority_id] = [];
          }
          candidatesMap[candidate.regional_authority_id].push(candidate);
        });
      }

      setCandidatesByAuthority(candidatesMap);
    } catch (error: any) {
      console.error('Error fetching all candidates:', error);
    }
  };

  const fetchConstituencies = async (authorityId: string) => {
    try {
      const { data, error } = await supabase
        .from('constituencies')
        .select('*')
        .eq('regional_authority_id', authorityId)
        .order('name');

      if (error) throw error;
      setConstituencies(data || []);
    } catch (error: any) {
      toast.error('Error fetching constituencies: ' + error.message);
    }
  };

  const fetchRegionalCandidates = async (authorityId: string) => {
    try {
      const { data, error } = await supabase
        .from('regional_authority_candidates')
        .select('*')
        .eq('regional_authority_id', authorityId)
        .order('full_name');

      if (error) throw error;
      setRegionalCandidates(data || []);
    } catch (error: any) {
      toast.error('Error fetching regional candidates: ' + error.message);
    }
  };

  const fetchConstituencyCandidates = async (constituencyId: string) => {
    try {
      const { data, error } = await supabase
        .from('constituency_candidates')
        .select('*')
        .eq('constituency_id', constituencyId)
        .order('full_name');

      if (error) throw error;
      setConstituencyCandidates(data || []);
    } catch (error: any) {
      toast.error('Error fetching constituency candidates: ' + error.message);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('candidate-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(filePath);

      setCandidatePhotoUrl(publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error: any) {
      toast.error('Error uploading photo: ' + error.message);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveAuthority = async (formData: FormData) => {
    const authorityData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      latitude: selectedLocation?.latitude || null,
      longitude: selectedLocation?.longitude || null,
      location_name: selectedLocation?.locationName || null,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingAuthority) {
        const { error } = await supabase
          .from('regional_authorities')
          .update(authorityData)
          .eq('id', editingAuthority.id);

        if (error) throw error;
        toast.success('Regional authority updated successfully');
      } else {
        if (error) throw error;
        toast.success('Regional authority created successfully');

        await sendRoleNotification({
          roles: ['super_admin', 'administrator'],
          type: 'regional_authority_created',
          title: 'New Regional Authority',
          message: `Regional Authority "${authorityData.name}" has been created.`,
        });
      }

      fetchAuthorities();
      setShowAuthorityDialog(false);
      setEditingAuthority(null);
      setSelectedLocation(null);
    } catch (error: any) {
      toast.error('Error saving regional authority: ' + error.message);
    }
  };

  const handleDeleteAuthority = async (id: string) => {
    if (!confirm('Are you sure you want to delete this regional authority? This will also delete all constituencies and candidates.')) return;

    try {
      const { error } = await supabase
        .from('regional_authorities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Regional authority deleted successfully');
      fetchAuthorities();
      if (selectedAuthority === id) {
        setSelectedAuthority(null);
        setConstituencies([]);
        setRegionalCandidates([]);
      }
    } catch (error: any) {
      toast.error('Error deleting regional authority: ' + error.message);
    }
  };

  const handleSaveConstituency = async (formData: FormData) => {
    if (!selectedAuthority) {
      toast.error('Please select a regional authority first');
      return;
    }

    const constituencyData = {
      regional_authority_id: selectedAuthority,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingConstituency) {
        const { error } = await supabase
          .from('constituencies')
          .update(constituencyData)
          .eq('id', editingConstituency.id);

        if (error) throw error;
        toast.success('Constituency updated successfully');
      } else {
        const { error } = await supabase
          .from('constituencies')
          .insert(constituencyData);

        if (error) throw error;
        toast.success('Constituency created successfully');
      }

      fetchConstituencies(selectedAuthority);
      setShowConstituencyDialog(false);
      setEditingConstituency(null);
    } catch (error: any) {
      toast.error('Error saving constituency: ' + error.message);
    }
  };

  const handleDeleteConstituency = async (id: string) => {
    if (!confirm('Are you sure you want to delete this constituency? This will also delete all candidates.')) return;

    try {
      const { error } = await supabase
        .from('constituencies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Constituency deleted successfully');
      if (selectedAuthority) fetchConstituencies(selectedAuthority);
      if (selectedConstituency === id) {
        setSelectedConstituency(null);
        setConstituencyCandidates([]);
      }
    } catch (error: any) {
      toast.error('Error deleting constituency: ' + error.message);
    }
  };

  const handleSaveRegionalCandidate = async (formData: FormData) => {
    if (!selectedAuthority) {
      toast.error('Please select a regional authority first');
      return;
    }

    const candidateData = {
      regional_authority_id: selectedAuthority,
      full_name: formData.get('full_name') as string,
      bio: formData.get('bio') as string,
      photo_url: candidatePhotoUrl,
      position: formData.get('position') as string,
      party_affiliation: formData.get('party_affiliation') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: formData.get('contact_phone') as string,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingRegionalCandidate) {
        const { error } = await supabase
          .from('regional_authority_candidates')
          .update(candidateData)
          .eq('id', editingRegionalCandidate.id);

        if (error) throw error;
        toast.success('Regional candidate updated successfully');
      } else {
        const { error } = await supabase
          .from('regional_authority_candidates')
          .insert(candidateData);

        if (error) throw error;
        toast.success('Regional candidate created successfully');
      }

      fetchRegionalCandidates(selectedAuthority);
      setShowRegionalCandidateDialog(false);
      setEditingRegionalCandidate(null);
      setCandidatePhotoUrl(null);
    } catch (error: any) {
      toast.error('Error saving regional candidate: ' + error.message);
    }
  };

  const handleDeleteRegionalCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;

    try {
      const { error } = await supabase
        .from('regional_authority_candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Regional candidate deleted successfully');
      if (selectedAuthority) fetchRegionalCandidates(selectedAuthority);
    } catch (error: any) {
      toast.error('Error deleting regional candidate: ' + error.message);
    }
  };

  const handleSaveConstituencyCandidate = async (formData: FormData) => {
    if (!selectedConstituency) {
      toast.error('Please select a constituency first');
      return;
    }

    const candidateData = {
      constituency_id: selectedConstituency,
      full_name: formData.get('full_name') as string,
      bio: formData.get('bio') as string,
      photo_url: candidatePhotoUrl,
      position: formData.get('position') as string,
      party_affiliation: formData.get('party_affiliation') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: formData.get('contact_phone') as string,
      is_active: formData.get('is_active') === 'on',
    };

    try {
      if (editingConstituencyCandidate) {
        const { error } = await supabase
          .from('constituency_candidates')
          .update(candidateData)
          .eq('id', editingConstituencyCandidate.id);

        if (error) throw error;
        toast.success('Constituency candidate updated successfully');
      } else {
        const { error } = await supabase
          .from('constituency_candidates')
          .insert(candidateData);

        if (error) throw error;
        toast.success('Constituency candidate created successfully');
      }

      fetchConstituencyCandidates(selectedConstituency);
      setShowConstituencyCandidateDialog(false);
      setEditingConstituencyCandidate(null);
      setCandidatePhotoUrl(null);
    } catch (error: any) {
      toast.error('Error saving constituency candidate: ' + error.message);
    }
  };

  const handleDeleteConstituencyCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;

    try {
      const { error } = await supabase
        .from('constituency_candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Constituency candidate deleted successfully');
      if (selectedConstituency) fetchConstituencyCandidates(selectedConstituency);
    } catch (error: any) {
      toast.error('Error deleting constituency candidate: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Regional Authorities</h1>
          <p className="text-gray-600 font-light mt-1">Manage regional authorities, constituencies, and candidates</p>
        </div>
        <Dialog open={showAuthorityDialog} onOpenChange={setShowAuthorityDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingAuthority(null);
              setSelectedLocation(null);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Regional Authority
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAuthority ? 'Edit' : 'Add'} Regional Authority</DialogTitle>
              <DialogDescription>
                {editingAuthority ? 'Update' : 'Create a new'} regional authority
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveAuthority(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={editingAuthority?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} defaultValue={editingAuthority?.description || ''} />
              </div>

              <div className="space-y-2">
                <Label>Location on Map</Label>
                <LocationPicker
                  onLocationSelect={setSelectedLocation}
                  initialLocation={editingAuthority ? {
                    latitude: editingAuthority.latitude || 0,
                    longitude: editingAuthority.longitude || 0,
                    locationName: editingAuthority.location_name || ''
                  } : null}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="is_active" name="is_active" defaultChecked={editingAuthority?.is_active !== false} />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAuthorityDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAuthority ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authorities.map((authority) => (
              <Card key={authority.id} className={selectedAuthority === authority.id ? 'border-[#d1242a] border-2 shadow-sm' : 'shadow-sm hover:shadow-md transition-shadow'}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#d1242a]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-[#d1242a]" strokeWidth={2} />
                    </div>
                    <span className="text-gray-900">{authority.name}</span>
                  </CardTitle>
                  {authority.location_name && (
                    <CardDescription className="flex items-center gap-1 text-xs ml-10">
                      <Map className="h-3 w-3" />
                      {authority.location_name}
                    </CardDescription>
                  )}
                  {authority.description && (
                    <CardDescription className="text-sm ml-10 mt-2 line-clamp-2">{authority.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedAuthority(authority.id)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingAuthority(authority);
                        setSelectedLocation(authority.latitude && authority.longitude ? {
                          latitude: authority.latitude,
                          longitude: authority.longitude,
                          locationName: authority.location_name || ''
                        } : null);
                        setShowAuthorityDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-gray-100 hover:bg-gray-200"
                      onClick={() => handleDeleteAuthority(authority.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <RegionalAuthorityMap
            authorities={authorities}
            candidates={candidatesByAuthority}
            onAuthorityClick={(id) => setSelectedAuthority(id)}
          />
        </TabsContent>
      </Tabs>

      {selectedAuthority && (
        <Tabs defaultValue="constituencies" className="mt-8">
          <TabsList>
            <TabsTrigger value="constituencies">Constituencies</TabsTrigger>
            <TabsTrigger value="candidates">Regional Candidates</TabsTrigger>
          </TabsList>

          <TabsContent value="constituencies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Constituencies</h2>
              <Dialog open={showConstituencyDialog} onOpenChange={setShowConstituencyDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingConstituency(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Constituency
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingConstituency ? 'Edit' : 'Add'} Constituency</DialogTitle>
                    <DialogDescription>
                      {editingConstituency ? 'Update' : 'Create a new'} constituency
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveConstituency(new FormData(e.currentTarget));
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="const_name">Name *</Label>
                      <Input id="const_name" name="name" defaultValue={editingConstituency?.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="const_description">Description</Label>
                      <Textarea id="const_description" name="description" rows={3} defaultValue={editingConstituency?.description || ''} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="const_is_active" name="is_active" defaultChecked={editingConstituency?.is_active !== false} />
                      <Label htmlFor="const_is_active">Active</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowConstituencyDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingConstituency ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {constituencies.map((constituency) => (
                <Card key={constituency.id} className={selectedConstituency === constituency.id ? 'border-[#d1242a] border-2 shadow-sm' : 'shadow-sm hover:shadow-md transition-shadow'}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-900">{constituency.name}</CardTitle>
                    {constituency.description && (
                      <CardDescription className="text-sm mt-2">{constituency.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedConstituency(constituency.id)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        View Candidates
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingConstituency(constituency);
                          setShowConstituencyDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-100 hover:bg-gray-200"
                        onClick={() => handleDeleteConstituency(constituency.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedConstituency && (
              <div className="mt-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Constituency Candidates</h3>
                  <Dialog open={showConstituencyCandidateDialog} onOpenChange={setShowConstituencyCandidateDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingConstituencyCandidate(null);
                        setCandidatePhotoUrl(null);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Candidate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingConstituencyCandidate ? 'Edit' : 'Add'} Constituency Candidate</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveConstituencyCandidate(new FormData(e.currentTarget));
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cc_full_name">Full Name *</Label>
                          <Input id="cc_full_name" name="full_name" defaultValue={editingConstituencyCandidate?.full_name} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cc_photo">Photo</Label>
                          <Input
                            id="cc_photo"
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                            disabled={uploadingPhoto}
                          />
                          {uploadingPhoto && <p className="text-sm text-gray-500">Uploading photo...</p>}
                          {(candidatePhotoUrl || editingConstituencyCandidate?.photo_url) && (
                            <img
                              src={candidatePhotoUrl || editingConstituencyCandidate?.photo_url || ''}
                              alt="Candidate"
                              className="w-24 h-24 object-cover rounded mt-2"
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cc_position">Position</Label>
                            <Input id="cc_position" name="position" defaultValue={editingConstituencyCandidate?.position || ''} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cc_party">Party Affiliation</Label>
                            <Input id="cc_party" name="party_affiliation" defaultValue={editingConstituencyCandidate?.party_affiliation || ''} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cc_bio">Biography</Label>
                          <Textarea id="cc_bio" name="bio" rows={4} defaultValue={editingConstituencyCandidate?.bio || ''} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cc_email">Contact Email</Label>
                            <Input id="cc_email" name="contact_email" type="email" defaultValue={editingConstituencyCandidate?.contact_email || ''} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cc_phone">Contact Phone</Label>
                            <Input id="cc_phone" name="contact_phone" defaultValue={editingConstituencyCandidate?.contact_phone || ''} />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="cc_is_active" name="is_active" defaultChecked={editingConstituencyCandidate?.is_active !== false} />
                          <Label htmlFor="cc_is_active">Active</Label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowConstituencyCandidateDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingConstituencyCandidate ? 'Update' : 'Create'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {constituencyCandidates.map((candidate) => (
                    <Card key={candidate.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        {candidate.photo_url && (
                          <img
                            src={candidate.photo_url}
                            alt={candidate.full_name}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <h4 className="font-semibold text-base text-gray-900">{candidate.full_name}</h4>
                        {candidate.position && <p className="text-sm text-gray-600 mt-1">{candidate.position}</p>}
                        {candidate.party_affiliation && <p className="text-sm text-gray-500 mt-0.5">{candidate.party_affiliation}</p>}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setEditingConstituencyCandidate(candidate);
                              setCandidatePhotoUrl(candidate.photo_url);
                              setShowConstituencyCandidateDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="bg-gray-100 hover:bg-gray-200"
                            onClick={() => handleDeleteConstituencyCandidate(candidate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="candidates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Regional Authority Candidates</h2>
              <Dialog open={showRegionalCandidateDialog} onOpenChange={setShowRegionalCandidateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingRegionalCandidate(null);
                    setCandidatePhotoUrl(null);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingRegionalCandidate ? 'Edit' : 'Add'} Regional Candidate</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveRegionalCandidate(new FormData(e.currentTarget));
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rc_full_name">Full Name *</Label>
                      <Input id="rc_full_name" name="full_name" defaultValue={editingRegionalCandidate?.full_name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rc_photo">Photo</Label>
                      <Input
                        id="rc_photo"
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                        disabled={uploadingPhoto}
                      />
                      {uploadingPhoto && <p className="text-sm text-gray-500">Uploading photo...</p>}
                      {(candidatePhotoUrl || editingRegionalCandidate?.photo_url) && (
                        <img
                          src={candidatePhotoUrl || editingRegionalCandidate?.photo_url || ''}
                          alt="Candidate"
                          className="w-24 h-24 object-cover rounded mt-2"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rc_position">Position</Label>
                        <Input id="rc_position" name="position" defaultValue={editingRegionalCandidate?.position || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rc_party">Party Affiliation</Label>
                        <Input id="rc_party" name="party_affiliation" defaultValue={editingRegionalCandidate?.party_affiliation || ''} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rc_bio">Biography</Label>
                      <Textarea id="rc_bio" name="bio" rows={4} defaultValue={editingRegionalCandidate?.bio || ''} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rc_email">Contact Email</Label>
                        <Input id="rc_email" name="contact_email" type="email" defaultValue={editingRegionalCandidate?.contact_email || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rc_phone">Contact Phone</Label>
                        <Input id="rc_phone" name="contact_phone" defaultValue={editingRegionalCandidate?.contact_phone || ''} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="rc_is_active" name="is_active" defaultChecked={editingRegionalCandidate?.is_active !== false} />
                      <Label htmlFor="rc_is_active">Active</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowRegionalCandidateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingRegionalCandidate ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regionalCandidates.map((candidate) => (
                <Card key={candidate.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {candidate.photo_url && (
                      <img
                        src={candidate.photo_url}
                        alt={candidate.full_name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h4 className="font-semibold text-base text-gray-900">{candidate.full_name}</h4>
                    {candidate.position && <p className="text-sm text-gray-600 mt-1">{candidate.position}</p>}
                    {candidate.party_affiliation && <p className="text-sm text-gray-500 mt-0.5">{candidate.party_affiliation}</p>}
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditingRegionalCandidate(candidate);
                          setCandidatePhotoUrl(candidate.photo_url);
                          setShowRegionalCandidateDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-gray-100 hover:bg-gray-200"
                        onClick={() => handleDeleteRegionalCandidate(candidate.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
