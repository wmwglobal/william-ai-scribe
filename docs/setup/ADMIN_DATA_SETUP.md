# Admin Dashboard Data Setup

## Current Status
✅ Basic test sessions created via API (4 sessions)
⚠️ Limited data due to Row Level Security (RLS) policies

## Quick View
Your admin dashboard at http://localhost:5173/admin should now show:
- 4 basic test sessions created
- Sessions will have minimal data (visitor_id, created_at, channel)
- Lead scores and other details may not be visible due to RLS restrictions

## Full Data Population (Recommended)

To see the admin dashboard with complete test data including:
- Lead scores and intents
- Full conversation transcripts
- Executive summaries
- Action items
- Analytics events

### Option 1: Run SQL Script in Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and run: `scripts/seed-test-data.sql`
4. This will create 8 comprehensive test sessions with full data

### Option 2: Temporarily Disable RLS (Development Only)
1. In Supabase SQL Editor, run:
```sql
-- DEVELOPMENT ONLY - Disable RLS temporarily
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts DISABLE ROW LEVEL SECURITY;
```

2. Run: `node scripts/seed-admin-data.cjs`

3. Re-enable RLS:
```sql
-- Re-enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;
```

## What You'll See After Full Setup

The admin dashboard will display:
- **8 test sessions** spanning the last 7 days
- **Lead scores** ranging from 20 (browsing) to 90 (high-intent purchase)
- **Various intents**: purchase_intent, product_inquiry, demo_request, etc.
- **Full conversation transcripts** for high-value leads
- **Executive summaries** and action items for qualified leads
- **Analytics events** for each session

## Test Data Overview

| Visitor | Lead Score | Intent | Notes |
|---------|------------|--------|-------|
| test-visitor-001 | 90 | purchase_intent | Enterprise lead with $50k budget |
| test-visitor-002 | 65 | product_inquiry | Pricing and features inquiry |
| test-visitor-003 | 20 | browsing | Just looking around |
| test-visitor-004 | 75 | demo_request | Startup founder |
| test-visitor-005 | 30 | support_inquiry | Existing customer |
| test-visitor-006 | 85 | consulting_inquiry | Fortune 500 company |
| test-visitor-007 | 50 | feature_inquiry | Digital agency |
| test-visitor-008 | 80 | partnership_vendor | Integration partner |

## Troubleshooting

If you don't see data after running the scripts:
1. Check browser console for any API errors
2. Verify you're logged in as admin (localhost auto-auth should work)
3. Try refreshing the page
4. Check the date range filter (default is 7 days)
5. Ensure your Supabase project is running and accessible