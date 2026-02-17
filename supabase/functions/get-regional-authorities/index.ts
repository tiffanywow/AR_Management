import { createClient } from 'npm:@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authorities, error: authError } = await supabase
      .from('regional_authorities')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (authError) {
      throw authError;
    }

    const authoritiesWithData = await Promise.all(
      (authorities || []).map(async (authority) => {
        const [constituenciesResult, candidatesResult] = await Promise.all([
          supabase
            .from('constituencies')
            .select('*')
            .eq('regional_authority_id', authority.id)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('regional_authority_candidates')
            .select('*')
            .eq('regional_authority_id', authority.id)
            .eq('is_active', true)
            .order('full_name')
        ]);

        const constituencies = constituenciesResult.data || [];
        const candidates = candidatesResult.data || [];

        const constituenciesWithCandidates = await Promise.all(
          constituencies.map(async (constituency) => {
            const { data: constituencyCandidates } = await supabase
              .from('constituency_candidates')
              .select('*')
              .eq('constituency_id', constituency.id)
              .eq('is_active', true)
              .order('full_name');

            return {
              ...constituency,
              candidates: constituencyCandidates || []
            };
          })
        );

        return {
          ...authority,
          constituencies: constituenciesWithCandidates,
          regional_candidates: candidates
        };
      })
    );

    return new Response(
      JSON.stringify({ authorities: authoritiesWithData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching regional authorities:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
