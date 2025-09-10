#!/usr/bin/env node

/**
 * Script to create an admin user for William AI Scribe
 * Usage: node scripts/create-admin-user.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Get Supabase credentials from environment or hardcode them
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://suyervjawrmbyyxetblv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''; // You need to add your service key here

if (!SUPABASE_SERVICE_KEY) {
  console.error(`
⚠️  Service key not found!

To create an admin user, you need the Supabase service role key.

Option 1: Manual Setup (Recommended)
====================================
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to Authentication > Users
3. Click "Add User" or "Invite User"
4. Enter your email and password
5. Click "Create User"
6. Run the SQL script in scripts/setup-admin.sql to set up the profiles table
7. Update your user's role to 'admin' in the profiles table

Option 2: Use Service Key
=========================
1. Go to Settings > API in your Supabase Dashboard
2. Copy the "service_role" key (keep this secret!)
3. Set it as SUPABASE_SERVICE_KEY environment variable
4. Run this script again

Option 3: Quick Test Access
===========================
For quick testing without full setup:
1. Temporarily modify src/components/AuthGuard.tsx
2. Change line 106-113 to always set isAuthenticated to true
3. Remember to revert this change before deploying!
`);
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdminUser() {
  try {
    // Create Supabase client with service key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔐 William AI Scribe - Admin User Setup\n');
    
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 characters): ');
    
    console.log('\n📝 Creating user account...');
    
    // Create user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });

    if (authError) {
      console.error('❌ Error creating user:', authError.message);
      process.exit(1);
    }

    console.log('✅ User created successfully!');
    
    // Create or update profile with admin role
    console.log('📝 Setting up admin profile...');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        role: 'admin'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('⚠️  Warning: Could not create profile:', profileError.message);
      console.log('You may need to run the SQL setup script first (scripts/setup-admin.sql)');
    } else {
      console.log('✅ Admin profile created!');
    }

    console.log(`
✨ Success! Admin user created.

You can now login at:
${SUPABASE_URL.replace('https://', 'http://localhost:5173/')}/auth

Email: ${email}
Password: [hidden]

Next steps:
1. Start the dev server: npm run dev
2. Navigate to http://localhost:5173/auth
3. Login with your credentials
4. Access the admin dashboard at /admin
`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Run the script
createAdminUser();