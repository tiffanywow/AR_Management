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

    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (pollsError) {
      throw pollsError;
    }

    const { data: userVotes, error: votesError } = await supabase
      .from('poll_votes')
      .select('poll_id, option_index')
      .eq('user_id', user.id);

    if (votesError) {
      throw votesError;
    }

    const userVotesMap = new Map<string, number[]>();
    userVotes?.forEach(vote => {
      if (!userVotesMap.has(vote.poll_id)) {
        userVotesMap.set(vote.poll_id, []);
      }
      userVotesMap.get(vote.poll_id)!.push(vote.option_index);
    });

    const pollsWithVotes = polls?.map(poll => ({
      ...poll,
      user_voted: userVotesMap.has(poll.id),
      user_votes: userVotesMap.get(poll.id) || [],
    }));

    return new Response(
      JSON.stringify({ polls: pollsWithVotes }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching polls:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
