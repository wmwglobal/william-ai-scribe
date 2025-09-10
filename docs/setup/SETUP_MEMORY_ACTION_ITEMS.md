# Setup Instructions for Memory Timeline & Action Items

## Overview
The Memory Timeline and Action Items features are now fully integrated but require database setup to function properly.

## Error: "Failed to load action items"
This error occurs because the `action_items` table hasn't been created in your Supabase database yet.

## Setup Steps

### 1. Create the Database Table

Go to your Supabase Dashboard SQL Editor:
1. Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Open the file `apply_action_items_migration.sql` 
3. Copy and paste the entire SQL content
4. Click "Run" to execute the SQL

### 2. Deploy Edge Functions

First, link your local project to Supabase (if not already done):
```bash
npx supabase link
```

Then deploy the new Edge Functions:
```bash
./deploy_edge_functions.sh
```

Or manually deploy each function:
```bash
npx supabase functions deploy action_items
npx supabase functions deploy consolidate_memories
```

### 3. Set Environment Variables

In your Supabase Dashboard, go to Settings → Edge Functions and add:
- `GROQ_API_KEY` - Required for AI extraction features
- Other API keys as needed

## Verify Setup

After completing the setup:
1. Refresh your application
2. Start a new chat session
3. The error should be resolved
4. Memories and action items will now be saved to the database

## Features Now Available

✅ **Memory Timeline**
- Automatic memory creation from conversations
- Short/medium/long-term memory scoping
- Memory recall based on context
- Automatic consolidation every 5 minutes

✅ **Action Items**
- Automatic extraction from high-intent conversations
- Manual creation via AI analysis
- Priority levels and ownership assignment
- Real-time synchronization
- Database persistence

## Troubleshooting

If you still see errors:
1. Check browser console for detailed error messages
2. Verify the table was created: 
   - Go to Table Editor in Supabase Dashboard
   - Look for `action_items` table
3. Check RLS policies are enabled
4. Ensure your session has proper permissions

## Testing the Integration

Try these conversation examples to test the features:

1. **Memory Creation**: "I work at Acme Corp as a software engineer"
2. **Action Item Creation**: "I'd like to schedule a demo next week"
3. **High Intent**: "We're looking to purchase an enterprise license"

The system will automatically:
- Save company/role information as memories
- Create action items for demos and follow-ups
- Categorize memories by importance
- Extract action items from conversation context