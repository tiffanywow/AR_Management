import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, full_name, role }: CreateUserRequest = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating user with:', { email, full_name, role });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    });

    console.log('Auth user created:', authData?.user?.id);

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the profile was created
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    console.log('Profile check:', { profile, profileError });

    // If profile wasn't created by trigger, create it manually
    if (profileError || !profile) {
      console.log('Creating profile manually');
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: full_name,
          role: role,
          is_active: true,
          created_by: authData.user.id,
        });

      if (insertError) {
        console.error('Profile insert error:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        message: 'User created successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});