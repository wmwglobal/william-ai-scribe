# Admin Setup Guide for William AI Scribe

## Quick Start - Access Admin Dashboard

There are several ways to set up admin access:

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/suyervjawrmbyyxetblv
   - Login with your Supabase account

2. **Create a User**
   - Navigate to `Authentication` → `Users`
   - Click `Add User` or `Invite User`
   - Enter your email and a password
   - Click `Create User`

3. **Run the SQL Setup**
   - Go to `SQL Editor` in Supabase Dashboard
   - Copy and paste the contents of `scripts/setup-admin.sql`
   - Run the query

4. **Update Your User Role**
   - Still in SQL Editor, run:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

5. **Login to Admin**
   - Start the dev server: `npm run dev`
   - Navigate to: http://localhost:5173/auth
   - Login with your credentials
   - You'll be redirected to `/admin`

### Option 2: For Development/Testing Only

If you just need quick access for development:

1. **Temporary Bypass (Dev Only)**
   - Create a temporary test user by modifying the auth check
   - In `src/components/AuthGuard.tsx`, temporarily add after line 25:
   ```javascript
   // TEMPORARY - REMOVE BEFORE COMMIT
   if (process.env.NODE_ENV === 'development') {
     setIsAuthenticated(true);
     setUserRole('admin');
     return;
   }
   ```

2. **Access Admin Directly**
   - Start dev server: `npm run dev`
   - Navigate to: http://localhost:5173/admin
   - ⚠️ **Remember to remove this bypass before committing!**

### Option 3: Using Node.js Script

1. **Get Service Role Key**
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (keep this secret!)

2. **Run Setup Script**
   ```bash
   export SUPABASE_SERVICE_KEY="your-service-role-key"
   node scripts/create-admin-user.js
   ```

3. **Follow the prompts** to create your admin user

## Admin Dashboard Features

Once logged in, you can:

- **View All Sessions**: See all chat sessions with visitors
- **Monitor Lead Scores**: Track lead quality and engagement
- **View Conversation Transcripts**: Read full conversation histories
- **Export Data**: Download session data in various formats
- **Analytics**: View conversation patterns and metrics
- **Session Details**: Click any session to see:
  - Full transcript
  - Lead scoring progression
  - Extracted entities
  - Key moments and intents

## Database Schema

The admin system uses these tables:

- `profiles`: User profiles with roles (viewer, admin, owner)
- `sessions`: Chat session records
- `utterances`: Individual messages in conversations
- `extracts`: Structured data extracted from conversations
- `summaries`: AI-generated session summaries

## Troubleshooting

### "Access Denied" Error
- Make sure your user has 'admin' or 'owner' role in the profiles table
- Check: `SELECT * FROM profiles WHERE email = 'your-email';`

### Can't Create User
- Ensure you have the correct Supabase project URL
- Check that email confirmation is disabled for local development

### No Sessions Showing
- Sessions are created when visitors interact with the chat
- Check the `sessions` table: `SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;`

### Login Not Working
- Clear browser localStorage: `localStorage.clear()`
- Check browser console for errors
- Verify Supabase auth settings

## Security Notes

- Never commit service role keys
- Use Row Level Security (RLS) policies
- Admin role should only be given to trusted users
- Consider using SSO for production environments