-- Seed test data for the scribe schema
-- This script can be run after the schema migration

-- Clear any existing test data
DELETE FROM scribe.utterances WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.summaries WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.extracts WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.events WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.sessions WHERE visitor_id LIKE 'test-%';

-- Insert test sessions
INSERT INTO scribe.sessions (visitor_id, started_at, ended_at, final_intent, lead_score, email, contact_name, cta_chosen, channel, consent, notes, created_at)
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
   'Very interested in enterprise plan. Budget: $50k/year',
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
   NOW() - INTERVAL '3 days'),

  -- Support inquiry from 4 days ago
  ('test-visitor-005', 
   NOW() - INTERVAL '4 days', 
   NOW() - INTERVAL '4 days' + INTERVAL '20 minutes', 
   'support_inquiry', 
   30, 
   'support@client.com', 
   'Support User', 
   NULL, 
   'web', 
   true, 
   'Existing customer with questions',
   NOW() - INTERVAL '4 days'),

  -- High-intent consultation from 5 days ago
  ('test-visitor-006', 
   NOW() - INTERVAL '5 days', 
   NOW() - INTERVAL '5 days' + INTERVAL '1 hour', 
   'consulting_inquiry', 
   85, 
   'enterprise@bigcorp.com', 
   'Enterprise Buyer', 
   'book_consultation', 
   'web', 
   true, 
   'Fortune 500 company exploring options',
   NOW() - INTERVAL '5 days'),

  -- Feature inquiry from 6 days ago
  ('test-visitor-007', 
   NOW() - INTERVAL '6 days', 
   NOW() - INTERVAL '6 days' + INTERVAL '30 minutes', 
   'feature_inquiry', 
   50, 
   'product@agency.com', 
   'Agency Manager', 
   NULL, 
   'web', 
   true, 
   'Digital agency evaluating for clients',
   NOW() - INTERVAL '6 days'),

  -- Partnership inquiry from a week ago
  ('test-visitor-008', 
   NOW() - INTERVAL '7 days', 
   NOW() - INTERVAL '7 days' + INTERVAL '40 minutes', 
   'partnership_vendor', 
   80, 
   'partner@vendor.com', 
   'Partner Manager', 
   'partner_application', 
   'web', 
   true, 
   'Potential integration partner',
   NOW() - INTERVAL '7 days');

-- Add utterances for the high-value lead
WITH high_value_session AS (
  SELECT id FROM scribe.sessions WHERE visitor_id = 'test-visitor-001' LIMIT 1
)
INSERT INTO scribe.utterances (session_id, speaker, text, ts)
SELECT 
  high_value_session.id,
  speaker,
  text,
  ts
FROM high_value_session, (
  VALUES 
    ('visitor', 'Hi, I am looking for an AI voice assistant for our enterprise', NOW() - INTERVAL '2 hours'),
    ('agent', 'Hello! I would be happy to help you explore our AI voice assistant solutions. Can you tell me more about your enterprise needs?', NOW() - INTERVAL '2 hours' + INTERVAL '5 seconds'),
    ('visitor', 'We need something that can handle customer support calls at scale', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'),
    ('agent', 'Our enterprise solution is perfect for high-volume customer support. We offer advanced features like multi-language support, custom voice training, and seamless CRM integration. Would you like to see a demo?', NOW() - INTERVAL '2 hours' + INTERVAL '35 seconds'),
    ('visitor', 'Yes, definitely. We have a budget of around $50,000 per year', NOW() - INTERVAL '2 hours' + INTERVAL '1 minute'),
    ('agent', 'Excellent! That budget aligns well with our enterprise tier. Let me help you schedule a personalized demo with our enterprise team. What is your email address?', NOW() - INTERVAL '2 hours' + INTERVAL '1 minute 5 seconds'),
    ('visitor', 'john.doe@example.com', NOW() - INTERVAL '2 hours' + INTERVAL '1 minute 30 seconds'),
    ('agent', 'Perfect! I have noted your email. Our enterprise team will reach out within 24 hours to schedule your demo.', NOW() - INTERVAL '2 hours' + INTERVAL '1 minute 35 seconds')
) AS t(speaker, text, ts);

-- Add utterances for the demo request
WITH demo_session AS (
  SELECT id FROM scribe.sessions WHERE visitor_id = 'test-visitor-004' LIMIT 1
)
INSERT INTO scribe.utterances (session_id, speaker, text, ts)
SELECT 
  demo_session.id,
  speaker,
  text,
  ts
FROM demo_session, (
  VALUES 
    ('visitor', 'I heard about your AI assistant from a friend. Can I see how it works?', NOW() - INTERVAL '3 days'),
    ('agent', 'Absolutely! I would love to show you our AI assistant capabilities. Are you looking for personal or business use?', NOW() - INTERVAL '3 days' + INTERVAL '5 seconds'),
    ('visitor', 'Business use. We are a startup looking to automate customer interactions', NOW() - INTERVAL '3 days' + INTERVAL '20 seconds'),
    ('agent', 'Perfect! Our solution is ideal for startups. We offer scalable pricing and easy integration. Would you like to schedule a personalized demo?', NOW() - INTERVAL '3 days' + INTERVAL '25 seconds'),
    ('visitor', 'Yes, that would be great', NOW() - INTERVAL '3 days' + INTERVAL '40 seconds'),
    ('agent', 'Excellent! I will arrange a demo for you. What is the best email to reach you?', NOW() - INTERVAL '3 days' + INTERVAL '45 seconds')
) AS t(speaker, text, ts);

-- Add summaries for high-value sessions
INSERT INTO scribe.summaries (session_id, executive_summary, action_items, crm_payload)
SELECT 
  id,
  CASE 
    WHEN visitor_id = 'test-visitor-001' THEN 'High-value enterprise lead interested in AI voice assistant for customer support. Budget: $50k/year. Needs API access and custom training.'
    WHEN visitor_id = 'test-visitor-004' THEN 'Startup founder requesting demo. Interested in AI features for customer engagement.'
    WHEN visitor_id = 'test-visitor-006' THEN 'Fortune 500 company exploring enterprise options. High potential for large-scale deployment.'
    WHEN visitor_id = 'test-visitor-008' THEN 'Potential integration partner interested in API collaboration and white-label solutions.'
    ELSE 'Qualified lead showing strong interest in our solution.'
  END,
  CASE 
    WHEN visitor_id = 'test-visitor-001' THEN '[{"owner": "sales", "text": "Schedule enterprise demo within 24 hours", "priority": "high"}, {"owner": "solutions", "text": "Prepare custom training documentation", "priority": "medium"}]'::jsonb
    ELSE '[{"owner": "sales", "text": "Follow up within 48 hours", "priority": "medium"}]'::jsonb
  END,
  jsonb_build_object(
    'lead_status', 'qualified',
    'next_step', 'demo_scheduled',
    'potential_value', CASE WHEN lead_score >= 85 THEN 'high' ELSE 'medium' END
  )
FROM scribe.sessions 
WHERE visitor_id LIKE 'test-%' AND lead_score >= 70;

-- Add some analytics events
INSERT INTO scribe.events (session_id, kind, payload, ts)
SELECT 
  id,
  unnest(ARRAY['page_view', 'feature_explored', 'cta_viewed']),
  unnest(ARRAY[
    '{"page": "/", "duration": 5}'::jsonb,
    '{"feature": "voice_demo", "interaction_time": 30}'::jsonb,
    '{"cta": "schedule_demo", "shown_after": 60}'::jsonb
  ]),
  generate_series(
    started_at,
    started_at + INTERVAL '3 minutes',
    INTERVAL '1 minute'
  )
FROM scribe.sessions 
WHERE visitor_id LIKE 'test-%';

-- Add extracts for sessions
INSERT INTO scribe.extracts (session_id, intent, confidence, entities, lead_score)
SELECT 
  id,
  final_intent,
  0.85 + (RANDOM() * 0.15), -- confidence between 0.85 and 1.0
  CASE 
    WHEN final_intent = 'purchase_intent' THEN '{"company": "Example Corp", "budget": "$50,000", "timeline": "Q1 2025"}'::jsonb
    WHEN final_intent = 'product_inquiry' THEN '{"interest": "pricing", "team_size": "10-50"}'::jsonb
    WHEN final_intent = 'demo_request' THEN '{"company": "Startup Inc", "use_case": "customer_support"}'::jsonb
    ELSE '{}'::jsonb
  END,
  lead_score
FROM scribe.sessions 
WHERE visitor_id LIKE 'test-%';

-- Output summary
SELECT 
  'Test Data Created Successfully!' as status,
  COUNT(*) as sessions_created,
  COUNT(CASE WHEN lead_score >= 70 THEN 1 END) as high_value_leads,
  AVG(lead_score)::int as avg_lead_score,
  (SELECT COUNT(*) FROM scribe.utterances WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%')) as utterances_created,
  (SELECT COUNT(*) FROM scribe.summaries WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%')) as summaries_created,
  (SELECT COUNT(*) FROM scribe.events WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%')) as events_created
FROM scribe.sessions 
WHERE visitor_id LIKE 'test-%';