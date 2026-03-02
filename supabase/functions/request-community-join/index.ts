import { createClient } from 'npm:@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  community_id: string;
  message?: string;
}

Deno.serve(async (req: Request) => {
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { community_id, message }: RequestBody = await req.json();

    if (!community_id) {
      return new Response(
        JSON.stringify({ error: 'community_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      return new Response(
        JSON.stringify({ error: 'Error fetching membership', details: membershipError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'User does not have a membership profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingMember, error: memberCheckError } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Error checking membership', details: memberCheckError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: 'You are already a member of this community' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingRequest, error: requestCheckError } = await supabase
      .from('community_join_requests')
      .select('id, status')
      .eq('community_id', community_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (requestCheckError && requestCheckError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Error checking existing requests', details: requestCheckError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return new Response(
          JSON.stringify({ error: 'You already have a pending request for this community' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (existingRequest.status === 'approved') {
        return new Response(
          JSON.stringify({ error: 'Your request was already approved. You should be a member.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (existingRequest.status === 'rejected') {
        return new Response(
          JSON.stringify({ error: 'Your previous request was rejected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: joinRequest, error: insertError } = await supabase
      .from('community_join_requests')
      .insert({
        community_id,
        user_id: user.id,
        membership_id: membership.id,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create join request', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Join request submitted successfully',
        data: joinRequest,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in request-community-join:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
