import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  try {
    const email = 'admin@ar.na';
    const password = 'admin123';
    const fullName = 'System Administrator';

    console.log('Creating super admin user...');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.error('Auth error:', authError);
      return;
    }

    console.log('User created in auth system:', authData.user.id);

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: 'super_admin',
          is_active: true,
          created_by: authData.user.id
        }
      ]);

    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }

    console.log('\n✅ Super Admin created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\nYou can now log in to the application.');

  } catch (error) {
    console.error('Error:', error);
  }
}

createSuperAdmin();
