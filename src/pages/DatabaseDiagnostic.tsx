import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface TableCheck {
  name: string;
  count: number | null;
  error: string | null;
  status: 'checking' | 'success' | 'error';
}

export default function DatabaseDiagnostic() {
  const [checks, setChecks] = useState<TableCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const tables = [
    'profiles',
    'party_members',
    'memberships',
    'broadcasts',
    'broadcast_likes',
    'broadcast_comments',
    'polls',
    'poll_options',
    'poll_votes',
    'campaigns',
    'campaign_collaborators',
    'campaign_tasks',
    'donations',
    'store_products',
    'store_orders',
    'communities',
    'push_notifications',
    'regional_authorities',
    'candidates',
  ];

  const checkTables = async () => {
    setLoading(true);
    const results: TableCheck[] = [];

    for (const tableName of tables) {
      setChecks((prev) => [...prev.filter((c) => c.name !== tableName), { name: tableName, count: null, error: null, status: 'checking' }]);

      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results.push({ name: tableName, count: null, error: error.message, status: 'error' });
        } else {
          results.push({ name: tableName, count: count || 0, error: null, status: 'success' });
        }
      } catch (err: any) {
        results.push({ name: tableName, count: null, error: err.message, status: 'error' });
      }

      setChecks([...results]);
    }

    setLoading(false);
  };

  const seedSampleData = async () => {
    setSeeding(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Seed party members
      const { data: existingMembers } = await supabase
        .from('party_members')
        .select('id')
        .limit(1);

      if (!existingMembers || existingMembers.length === 0) {
        const sampleMembers = [
          { full_name: 'John Kapenda', phone: '+264811234567', region: 'Khomas', constituency: 'Windhoek East', status: 'active' },
          { full_name: 'Maria Shikongo', phone: '+264812234567', region: 'Oshana', constituency: 'Oshakati West', status: 'active' },
          { full_name: 'David Nambala', phone: '+264813234567', region: 'Erongo', constituency: 'Walvis Bay Urban', status: 'active' },
          { full_name: 'Sarah Hamutenya', phone: '+264814234567', region: 'Otjozondjupa', constituency: 'Otjiwarongo', status: 'active' },
          { full_name: 'Peter Nghidinwa', phone: '+264815234567', region: 'Omaheke', constituency: 'Gobabis', status: 'active' },
        ];

        const { error: memberError } = await supabase
          .from('party_members')
          .insert(sampleMembers);

        if (memberError) {
          console.error('Error seeding members:', memberError);
          toast.error('Failed to seed party members');
        } else {
          toast.success('Party members seeded');
        }
      }

      // Seed memberships
      const { data: existingMemberships } = await supabase
        .from('memberships')
        .select('id')
        .limit(1);

      if (!existingMemberships || existingMemberships.length === 0) {
        const { data: members } = await supabase
          .from('party_members')
          .select('id, full_name, phone, region')
          .limit(5);

        if (members && members.length > 0) {
          const memberships = members.map((member, index) => ({
            user_id: user.id,
            member_id: member.id,
            full_name: member.full_name,
            phone: member.phone,
            region: member.region,
            membership_number: `AR${String(10001 + index).padStart(6, '0')}`,
            status: 'active',
          }));

          const { error: membershipError } = await supabase
            .from('memberships')
            .insert(memberships);

          if (membershipError) {
            console.error('Error seeding memberships:', membershipError);
            toast.error('Failed to seed memberships');
          } else {
            toast.success('Memberships seeded');
          }
        }
      }

      // Seed broadcasts
      const { data: existingBroadcasts } = await supabase
        .from('broadcasts')
        .select('id')
        .limit(1);

      if (!existingBroadcasts || existingBroadcasts.length === 0) {
        const sampleBroadcasts = [
          {
            created_by: user.id,
            content: 'Welcome to AR Management Platform! This is a test broadcast to all members.',
            status: 'published',
            published_at: new Date().toISOString(),
            likes_count: 5,
            comments_count: 2,
          },
          {
            created_by: user.id,
            content: 'Reminder: Regional meeting this Saturday at 10 AM. All members are encouraged to attend.',
            status: 'published',
            published_at: new Date(Date.now() - 86400000).toISOString(),
            likes_count: 12,
            comments_count: 3,
          },
          {
            created_by: user.id,
            content: 'Thank you to everyone who participated in last week\'s community cleanup! Together we make a difference.',
            status: 'published',
            published_at: new Date(Date.now() - 172800000).toISOString(),
            likes_count: 24,
            comments_count: 8,
          },
        ];

        const { error: broadcastError } = await supabase
          .from('broadcasts')
          .insert(sampleBroadcasts);

        if (broadcastError) {
          console.error('Error seeding broadcasts:', broadcastError);
          toast.error('Failed to seed broadcasts');
        } else {
          toast.success('Broadcasts seeded');
        }
      }

      // Seed campaigns
      const { data: existingCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .limit(1);

      if (!existingCampaigns || existingCampaigns.length === 0) {
        const sampleCampaigns = [
          {
            name: 'Youth Empowerment Initiative',
            description: 'Supporting youth education and skills development',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 90 * 86400000).toISOString(),
            target_amount: 500000,
            raised_amount: 125000,
            status: 'active',
            created_by: user.id,
          },
          {
            name: 'Community Infrastructure Fund',
            description: 'Building better facilities for our communities',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 120 * 86400000).toISOString(),
            target_amount: 1000000,
            raised_amount: 350000,
            status: 'active',
            created_by: user.id,
          },
        ];

        const { error: campaignError } = await supabase
          .from('campaigns')
          .insert(sampleCampaigns);

        if (campaignError) {
          console.error('Error seeding campaigns:', campaignError);
          toast.error('Failed to seed campaigns');
        } else {
          toast.success('Campaigns seeded');
        }
      }

      // Seed polls
      const { data: existingPolls } = await supabase
        .from('polls')
        .select('id')
        .limit(1);

      if (!existingPolls || existingPolls.length === 0) {
        const { data: newPoll } = await supabase
          .from('polls')
          .insert({
            title: 'What should be our next community initiative?',
            description: 'Vote for the initiative you think is most important',
            created_by: user.id,
            end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
            status: 'active',
          })
          .select()
          .single();

        if (newPoll) {
          await supabase.from('poll_options').insert([
            { poll_id: newPoll.id, option_text: 'Education Programs', vote_count: 45 },
            { poll_id: newPoll.id, option_text: 'Healthcare Services', vote_count: 38 },
            { poll_id: newPoll.id, option_text: 'Infrastructure Development', vote_count: 52 },
            { poll_id: newPoll.id, option_text: 'Youth Sports Facilities', vote_count: 31 },
          ]);
          toast.success('Poll seeded');
        }
      }

      toast.success('Sample data seeded successfully!');
      await checkTables();
    } catch (error: any) {
      console.error('Error seeding data:', error);
      toast.error(`Seeding failed: ${error.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Database Diagnostic</h1>
        <p className="text-gray-600">Check database connectivity and table access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Status Check</CardTitle>
          <CardDescription>
            This tool checks if you can access database tables and shows row counts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={checkTables} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Checking...' : 'Run Diagnostics'}
            </Button>
            <Button onClick={seedSampleData} disabled={seeding} variant="outline">
              {seeding ? 'Seeding...' : 'Seed Sample Data'}
            </Button>
          </div>

          {checks.length > 0 && (
            <div className="border rounded-lg divide-y">
              {checks.map((check) => (
                <div key={check.name} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {check.status === 'checking' && (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {check.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {check.status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{check.name}</p>
                      {check.error && (
                        <p className="text-sm text-red-600">{check.error}</p>
                      )}
                    </div>
                  </div>
                  {check.count !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-semibold text-gray-900">
                        {check.count.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">rows</span>
                      {check.count === 0 && (
                        <AlertCircle className="h-4 w-4 text-yellow-600 ml-2" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {checks.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Total Tables</p>
                  <p className="text-2xl font-semibold text-blue-900">{checks.length}</p>
                </div>
                <div>
                  <p className="text-green-700">Accessible</p>
                  <p className="text-2xl font-semibold text-green-900">
                    {checks.filter((c) => c.status === 'success').length}
                  </p>
                </div>
                <div>
                  <p className="text-red-700">Errors</p>
                  <p className="text-2xl font-semibold text-red-900">
                    {checks.filter((c) => c.status === 'error').length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p><strong>If tables show 0 rows:</strong> Click "Seed Sample Data" to populate with test data</p>
          <p><strong>If you see permission errors:</strong> Check your RLS policies in Supabase</p>
          <p><strong>If tables are missing:</strong> Run the migrations in supabase/migrations/</p>
          <p><strong>After seeding:</strong> Return to the dashboard to see data displayed</p>
        </CardContent>
      </Card>
    </div>
  );
}
