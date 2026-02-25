import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, Building2, Target, Award, Users, Phone, Mail, Globe, MapPin, Map, Edit2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sendRoleNotification } from '@/lib/notificationTriggers';

interface General {
  id: string;
  organization_name: string;
  tagline: string;
  logo_text: string;
  join_title: string;
  join_text: string;
  updated_at: string;
}

interface Mission {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
}

interface Value {
  id: string;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

interface Leader {
  id: string;
  name: string;
  position: string;
  region: string;
  sort_order: number;
  is_active: boolean;
}

interface Achievement {
  id: string;
  text: string;
  sort_order: number;
  is_active: boolean;
}

interface Contact {
  id: string;
  icon: string;
  label: string;
  value: string;
  url: string;
  sort_order: number;
  is_active: boolean;
}

interface RegionClassification {
  id: string;
  region_name: string;
  region_code: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export default function PartyManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [general, setGeneral] = useState<General | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [values, setValues] = useState<Value[]>([]);
  const [leadership, setLeadership] = useState<Leader[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [regions, setRegions] = useState<RegionClassification[]>([]);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editRegionForm, setEditRegionForm] = useState({ region_code: '', region_name: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<'values' | 'leadership' | 'achievements' | 'contacts'>('values');
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchGeneral(),
      fetchMission(),
      fetchValues(),
      fetchLeadership(),
      fetchAchievements(),
      fetchContacts(),
      fetchRegions(),
    ]);
  };

  const fetchGeneral = async () => {
    const { data, error } = await supabase
      .from('about_general')
      .select('*')
      .single();
    if (!error && data) setGeneral(data);
  };

  const fetchMission = async () => {
    const { data, error } = await supabase
      .from('about_mission')
      .select('*')
      .eq('is_active', true)
      .single();
    if (!error && data) setMission(data);
  };

  const fetchValues = async () => {
    const { data, error } = await supabase
      .from('about_values')
      .select('*')
      .order('sort_order');
    if (!error && data) setValues(data);
  };

  const fetchLeadership = async () => {
    const { data, error } = await supabase
      .from('about_leadership')
      .select('*')
      .order('sort_order');
    if (!error && data) setLeadership(data);
  };

  const fetchAchievements = async () => {
    const { data, error } = await supabase
      .from('about_achievements')
      .select('*')
      .order('sort_order');
    if (!error && data) setAchievements(data);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('about_contact')
      .select('*')
      .order('sort_order');
    if (!error && data) setContacts(data);
  };

  const fetchRegions = async () => {
    const { data, error } = await supabase
      .from('region_classifications')
      .select('*')
      .order('region_code', { ascending: true });
    if (!error && data) setRegions(data);
  };

  const handleSaveGeneral = async () => {
    if (!general) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('about_general')
        .update({
          organization_name: general.organization_name,
          tagline: general.tagline,
          logo_text: general.logo_text,
          join_title: general.join_title,
          join_text: general.join_text,
        })
        .eq('id', general.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'General information updated' });

      await sendRoleNotification({
        roles: ['super_admin', 'administrator', 'communications_officer'],
        type: 'party_info_updated',
        title: 'Party Information Updated',
        message: 'The general party information has been updated.',
      });

      fetchGeneral();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMission = async () => {
    if (!mission) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('about_mission')
        .update({
          title: mission.title,
          content: mission.content,
        })
        .eq('id', mission.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Mission statement updated' });
      fetchMission();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (section: 'values' | 'leadership' | 'achievements' | 'contacts', item?: any) => {
    setCurrentSection(section);
    setEditingItem(item || null);
    setDialogOpen(true);
  };

  const handleSaveItem = async (formData: any) => {
    setLoading(true);
    try {
      let table = '';
      if (currentSection === 'values') table = 'about_values';
      else if (currentSection === 'leadership') table = 'about_leadership';
      else if (currentSection === 'achievements') table = 'about_achievements';
      else if (currentSection === 'contacts') table = 'about_contact';

      if (editingItem) {
        const { error } = await supabase
          .from(table)
          .update(formData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table)
          .insert([formData]);
        if (error) throw error;
      }

      toast({ title: 'Success', description: `${currentSection} ${editingItem ? 'updated' : 'created'}` });
      setDialogOpen(false);
      fetchAllData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, table: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Item deleted' });
      fetchAllData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditRegion = (region: RegionClassification) => {
    setEditingRegionId(region.id);
    setEditRegionForm({
      region_code: region.region_code,
      region_name: region.region_name,
    });
  };

  const handleCancelEditRegion = () => {
    setEditingRegionId(null);
    setEditRegionForm({ region_code: '', region_name: '' });
  };

  const handleSaveRegion = async (regionId: string) => {
    if (!editRegionForm.region_code || !editRegionForm.region_name) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('region_classifications')
        .update({
          region_code: editRegionForm.region_code,
          region_name: editRegionForm.region_name,
        })
        .eq('id', regionId);

      if (error) throw error;

      toast({
        title: 'Region Updated',
        description: 'Region classification has been updated successfully',
      });

      setEditingRegionId(null);
      setEditRegionForm({ region_code: '', region_name: '' });
      fetchRegions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update region classification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Party Management</h1>
        <p className="text-gray-600 font-light">Manage party information displayed on the mobile app</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="mission">Mission</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
          <TabsTrigger value="leadership">Leadership</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#d1242a]" />
                General Information
              </CardTitle>
              <CardDescription>Organization details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  value={general?.organization_name || ''}
                  onChange={(e) => setGeneral(general ? { ...general, organization_name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={general?.tagline || ''}
                  onChange={(e) => setGeneral(general ? { ...general, tagline: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Logo Text</Label>
                <Input
                  value={general?.logo_text || ''}
                  onChange={(e) => setGeneral(general ? { ...general, logo_text: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Join Section Title</Label>
                <Input
                  value={general?.join_title || ''}
                  onChange={(e) => setGeneral(general ? { ...general, join_title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Join Section Text</Label>
                <Textarea
                  value={general?.join_text || ''}
                  onChange={(e) => setGeneral(general ? { ...general, join_text: e.target.value } : null)}
                  className="min-h-24"
                />
              </div>
              <Button onClick={handleSaveGeneral} disabled={loading} className="bg-[#d1242a] hover:bg-[#b91c1c]">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#d1242a]" />
                Mission Statement
              </CardTitle>
              <CardDescription>Your organization's mission and purpose</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={mission?.title || ''}
                  onChange={(e) => setMission(mission ? { ...mission, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={mission?.content || ''}
                  onChange={(e) => setMission(mission ? { ...mission, content: e.target.value } : null)}
                  className="min-h-32"
                />
              </div>
              <Button onClick={handleSaveMission} disabled={loading} className="bg-[#d1242a] hover:bg-[#b91c1c]">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="values" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#d1242a]" />
                    Core Values
                  </CardTitle>
                  <CardDescription>Organization values and principles</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('values')} className="bg-[#d1242a] hover:bg-[#b91c1c]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Value
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {values.map((value) => (
                  <div key={value.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#d1242a]/10 rounded-lg flex items-center justify-center">
                        <span className="text-[#d1242a]">{value.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{value.title}</h3>
                        <p className="text-sm text-gray-600">{value.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleOpenDialog('values', value)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleDelete(value.id, 'about_values')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leadership" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#d1242a]" />
                    Leadership Team
                  </CardTitle>
                  <CardDescription>Organization leaders and their roles</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('leadership')} className="bg-[#d1242a] hover:bg-[#b91c1c]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Leader
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leadership.map((leader) => (
                  <div key={leader.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{leader.name}</h3>
                      <p className="text-sm text-gray-600">{leader.position}</p>
                      <p className="text-xs text-gray-500">{leader.region}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleOpenDialog('leadership', leader)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleDelete(leader.id, 'about_leadership')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#d1242a]" />
                    Key Achievements
                  </CardTitle>
                  <CardDescription>Notable accomplishments and milestones</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('achievements')} className="bg-[#d1242a] hover:bg-[#b91c1c]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Achievement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <p>{achievement.text}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleOpenDialog('achievements', achievement)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleDelete(achievement.id, 'about_achievements')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-[#d1242a]" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>Contact methods and details</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('contacts')} className="bg-[#d1242a] hover:bg-[#b91c1c]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#d1242a]/10 rounded-lg flex items-center justify-center">
                        <span className="text-[#d1242a]">{contact.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{contact.label}</h3>
                        <p className="text-sm text-gray-600">{contact.value}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleOpenDialog('contacts', contact)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="bg-gray-100 hover:bg-gray-200" onClick={() => handleDelete(contact.id, 'about_contact')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-[#d1242a]" />
                Region Classifications
              </CardTitle>
              <CardDescription>
                Manage region codes for membership number generation. Each region has a unique code used as a prefix for membership numbers (e.g., B-0001 for Erongo).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {editingRegionId === region.id ? (
                      <>
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="space-y-2">
                            <Label className="text-xs">Region Code</Label>
                            <Input
                              className="w-20"
                              placeholder="A"
                              value={editRegionForm.region_code}
                              onChange={(e) => setEditRegionForm({ ...editRegionForm, region_code: e.target.value.toUpperCase() })}
                              maxLength={3}
                            />
                          </div>
                          <div className="space-y-2 flex-1">
                            <Label className="text-xs">Region Name</Label>
                            <Input
                              placeholder="Region name"
                              value={editRegionForm.region_name}
                              onChange={(e) => setEditRegionForm({ ...editRegionForm, region_name: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleSaveRegion(region.id)}
                            disabled={loading}
                          >
                            <Save className="h-4 w-4 mr-1" strokeWidth={1.5} />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-600 hover:text-gray-700"
                            onClick={handleCancelEditRegion}
                            disabled={loading}
                          >
                            <X className="h-4 w-4 mr-1" strokeWidth={1.5} />
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-16 h-16 bg-[#d1242a]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-bold text-[#d1242a]">{region.region_code}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <MapPin className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                              <p className="font-medium text-gray-900">{region.region_name}</p>
                            </div>
                            <p className="text-sm text-gray-500">
                              Membership format: {region.region_code}-0001, {region.region_code}-0002, ...
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-gray-100 hover:bg-gray-200"
                          onClick={() => handleEditRegion(region)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" strokeWidth={1.5} />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">How Region Codes Work</h3>
                  <p className="text-sm text-blue-800">
                    When a new member is registered, their membership number is automatically generated using the region code as a prefix.
                    For example, a member from Erongo (code B) will receive a membership number like B-0001, B-0002, etc.
                    The system automatically increments the number based on existing members in that region.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        section={currentSection}
        item={editingItem}
        onSave={handleSaveItem}
        loading={loading}
      />
    </div>
  );
}

function ItemDialog({ open, onOpenChange, section, item, onSave, loading }: any) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        icon: '⭐',
        title: '',
        description: '',
        name: '',
        position: '',
        region: '',
        text: '',
        label: '',
        value: '',
        url: '',
        sort_order: 0,
        is_active: true,
      });
    }
  }, [item, section]);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} {section}</DialogTitle>
          <DialogDescription>Fill in the details below</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {section === 'values' && (
            <>
              <div className="space-y-2">
                <Label>Icon (Emoji)</Label>
                <Input
                  value={formData.icon || ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="⭐"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </>
          )}

          {section === 'leadership' && (
            <>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={formData.region || ''}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
            </>
          )}

          {section === 'achievements' && (
            <div className="space-y-2">
              <Label>Achievement Text</Label>
              <Textarea
                value={formData.text || ''}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              />
            </div>
          )}

          {section === 'contacts' && (
            <>
              <div className="space-y-2">
                <Label>Icon (Emoji)</Label>
                <Input
                  value={formData.icon || ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📞"
                />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={formData.label || ''}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="+264 81 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>URL (Optional)</Label>
                <Input
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="tel:+26481234567"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={formData.sort_order || 0}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-[#d1242a] hover:bg-[#b91c1c]">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
