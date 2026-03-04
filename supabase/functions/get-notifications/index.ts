import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const userEmail = url.searchParams.get('user_email');
    const unreadOnly = url.searchParams.get('unread_only') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'user_email parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // fetch from legacy notifications table
    let query1 = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userEmail)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (unreadOnly) {
      query1 = query1.eq('is_read', false);
    }

    // also fetch from push_notifications by joining with profiles to map email->uuid
    let query2 = supabase
      .from('push_notifications')
      .select('push_notifications.*')
      .limit(limit)
      .order('created_at', { ascending: false })
      .innerJoin('profiles', 'profiles.id', 'push_notifications.user_id')
      .eq('profiles.email', userEmail);
    if (unreadOnly) {
      query2 = query2.eq('push_notifications.is_read', false);
    }

    const [{ data: n1, error: err1 }, { data: n2, error: err2 }] = await Promise.all([query1, query2]);

    if (err1) throw err1;
    if (err2) throw err2;

    const notifications = [...(n1 || []), ...(n2 || [])].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, limit);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notifications: notifications || [],
        count: notifications?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});