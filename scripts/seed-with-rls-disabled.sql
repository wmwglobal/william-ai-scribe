-- IMPORTANT: This script temporarily disables RLS to insert test data
-- Only use this in development environments!

-- Step 1: Temporarily disable RLS on relevant tables
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- Step 2: Clear any existing test data
DELETE FROM public.utterances WHERE session_id IN (SELECT id FROM public.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM public.summaries WHERE session_id IN (SELECT id FROM public.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM public.extracts WHERE session_id IN (SELECT id FROM public.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM public.events WHERE session_id IN (SELECT id FROM public.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM public.sessions WHERE visitor_id LIKE 'test-%';

-- Step 3: Insert test sessions
INSERT INTO public.sessions (visitor_id, started_at, ended_at, final_intent, lead_score, email, contact_name, cta_chosen, channel, consent, notes, created_at)
VALUES 
  -- High-value lead from 2 hours ago
  ('test-visitor-001', 
   NOW() - INTERVAL '2 hours', 
   NOW() - INTERVAL '1 hour', 
   'purchase_intent', 
   90, 
   'john.doe@example.com', 
   'John Doe', 
   'schedule_demo', 
   'web', 
   true, 
   'Very interested in enterprise plan',
   NOW() - INTERVAL '2 hours'),
  
  -- Medium-value lead from yesterday
  ('test-visitor-002', 
   NOW() - INTERVAL '1 day 3 hours', 
   NOW() - INTERVAL '1 day 2 hours', 
   'product_inquiry', 
   65, 
   'jane.smith@company.com', 
   'Jane Smith', 
   NULL, 
   'web', 
   true, 
   'Asking about pricing and features',
   NOW() - INTERVAL '1 day 3 hours'),
  
  -- Low-value browsing session from 2 days ago
  ('test-visitor-003', 
   NOW() - INTERVAL '2 days', 
   NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', 
   'browsing', 
   20, 
   NULL, 
   NULL, 
   NULL, 
   'web', 
   false, 
   'Just looking around',
   NOW() - INTERVAL '2 days'),
  
  -- Demo request from 3 days ago
  ('test-visitor-004', 
   NOW() - INTERVAL '3 days', 
   NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 
   'demo_request', 
   75, 
   'mike.wilson@startup.io', 
   'Mike Wilson', 
   'request_demo', 
   'web', 
   true, 
   'Startup founder, interested in AI features',
   NOW() - INTERVAL '3 days');

-- Step 4: Add a simple conversation for the high-value lead
WITH high_value_session AS (
  SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-001' LIMIT 1
)
INSERT INTO public.utterances (session_id, speaker, text, ts)
SELECT 
  high_value_session.id,
  unnest(ARRAY['visitor', 'agent', 'visitor', 'agent']),
  unnest(ARRAY[
    'Hi, I am looking for an AI voice assistant for our enterprise',
    'Hello! I would be happy to help you explore our AI voice assistant solutions.',
    'We need something that can handle customer support calls at scale',
    'Our enterprise solution is perfect for high-volume customer support.'
  ]),
  generate_series(
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes',
    INTERVAL '40 seconds'
  )
FROM high_value_session;

-- Step 5: Add a summary for the high-value lead
INSERT INTO public.summaries (session_id, executive_summary, action_items)
SELECT 
  id,
  'High-value enterprise lead interested in AI voice assistant. Budget: $50k/year.',
  '[{"owner": "sales", "text": "Schedule demo within 24 hours", "priority": "high"}]'::jsonb
FROM public.sessions 
WHERE visitor_id = 'test-visitor-001';

-- Step 6: Re-enable RLS (CRITICAL!)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Step 7: Verify the data was inserted
SELECT 
  'Test data inserted successfully!' as status,
  COUNT(*) as sessions_created,
  COUNT(CASE WHEN lead_score >= 70 THEN 1 END) as high_value_leads,
  AVG(lead_score)::int as avg_lead_score
FROM public.sessions 
WHERE visitor_id LIKE 'test-%';