import { createClient } from 'npm:@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

interface VoteRequest {
  poll_id: string;
  option_indices: number[];
}

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    const { poll_id, option_indices }: VoteRequest = await req.json();

    if (!poll_id || !option_indices || !Array.isArray(option_indices) || option_indices.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request. poll_id and option_indices are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', poll_id)
      .single();

    if (pollError || !poll) {
      return new Response(
        JSON.stringify({ error: 'Poll not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (poll.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Poll is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (poll.poll_type === 'single' && option_indices.length > 1) {
      return new Response(
        JSON.stringify({ error: 'This is a single choice poll. Only one option can be selected.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const index of option_indices) {
      if (index < 0 || index >= poll.options.length) {
        return new Response(
          JSON.stringify({ error: `Invalid option index: ${index}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: existingVotes, error: checkError } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', poll_id)
      .eq('user_id', user.id);

    if (checkError) {
      throw checkError;
    }

    if (existingVotes && existingVotes.length > 0) {
      return new Response(
        JSON.stringify({ error: 'You have already voted on this poll' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const votesToInsert = option_indices.map(optionIndex => ({
      poll_id,
      user_id: user.id,
      option_index: optionIndex,
    }));

    const { error: insertError } = await supabase
      .from('poll_votes')
      .insert(votesToInsert);

    if (insertError) {
      throw insertError;
    }

    const updatedOptions = [...poll.options];
    option_indices.forEach(index => {
      updatedOptions[index].votes += 1;
    });

    const newTotalVotes = (poll.total_votes || 0) + option_indices.length;
    const newTotalParticipants = (poll.total_participants || 0) + 1;

    const { error: updateError } = await supabase
      .from('polls')
      .update({
        options: updatedOptions,
        total_votes: newTotalVotes,
        total_participants: newTotalParticipants,
      })
      .eq('id', poll_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vote submitted successfully',
        poll: {
          ...poll,
          options: updatedOptions,
          total_votes: newTotalVotes,
          total_participants: newTotalParticipants,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error submitting vote:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
