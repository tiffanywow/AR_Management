# Setup Super Admin Account

Since you're experiencing issues with the signup process, here's an alternative method to create your super admin account:

## Option 1: Use Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `dowsehmvxnglhkjgmzin`
3. Go to **Authentication** → **Users**
4. Click **"Add user"**
5. Choose **"Create new user"**
6. Enter:
   - **Email**: admin@ar.na (or your preferred email)
   - **Password**: Choose a secure password
   - **Auto Confirm User**: YES (important!)
   - **User Metadata**: Add this JSON:
     ```json
     {
       "full_name": "System Administrator",
       "role": "super_admin"
     }
     ```
7. Click **"Create user"**
8. The profile will be created automatically via the database trigger

## Option 2: Direct Database Insert

If Option 1 doesn't work, you can manually insert a user:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this query (replace the email and adjust values as needed):

```sql
-- First, you need to create the auth user in the Supabase Dashboard (Authentication > Users)
-- Then get the user ID and run this to create the profile:

INSERT INTO profiles (id, email, full_name, role, is_active, created_by)
VALUES (
  'YOUR_USER_ID_FROM_AUTH_USERS',  -- Replace with actual UUID from auth.users
  'admin@ar.na',
  'System Administrator',
  'super_admin',
  true,
  'YOUR_USER_ID_FROM_AUTH_USERS'   -- Same UUID as above
);
```

## Troubleshooting

If you're still having issues:

1. **Check browser console** (F12) for error messages when clicking "Create Account"
2. **Check if email confirmation is required**:
   - Go to Supabase Dashboard → Authentication → Settings
   - Under "Email Auth", make sure **"Enable email confirmations"** is OFF
3. **Check your browser's network tab** to see if the signup request is being sent

## After Creating the Account

Once your super admin account is created:
1. Go to the login page: `/login`
2. Enter your credentials
3. You'll have access to all features including the User Management page
4. You can then create additional users (administrators and finance users) through the UI

## Current Issue

The signup form might not be working due to:
- Email confirmation being enabled in Supabase
- SMTP not configured for email sending
- Browser console errors

Please check the browser console (F12 → Console tab) when you try to sign up and share any error messages you see.
