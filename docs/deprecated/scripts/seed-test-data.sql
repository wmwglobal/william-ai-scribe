-- Script to seed test data for admin dashboard
-- Run this in your Supabase SQL Editor to create sample sessions and conversations

-- Clear existing test data (optional - be careful in production!)
-- DELETE FROM public.utterances WHERE session_id IN (SELECT id FROM public.sessions WHERE visitor_id LIKE 'test-%');
-- DELETE FROM public.sessions WHERE visitor_id LIKE 'test-%';

-- Create test sessions with various lead scores and intents
INSERT INTO public.sessions (visitor_id, started_at, ended_at, final_intent, lead_score, email, contact_name, cta_chosen, channel, consent, notes)
VALUES 
  -- High-value lead from today
  ('test-visitor-001', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 'purchase_intent', 90, 'john.doe@example.com', 'John Doe', 'schedule_demo', 'web', true, 'Very interested in enterprise plan'),
  
  -- Medium-value lead from yesterday
  ('test-visitor-002', NOW() - INTERVAL '1 day 3 hours', NOW() - INTERVAL '1 day 2 hours', 'product_inquiry', 65, 'jane.smith@company.com', 'Jane Smith', NULL, 'web', true, 'Asking about pricing and features'),
  
  -- Low-value browsing session from 2 days ago
  ('test-visitor-003', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', 'browsing', 20, NULL, NULL, NULL, 'web', false, 'Just looking around'),
  
  -- Demo request from 3 days ago
  ('test-visitor-004', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 'demo_request', 75, 'mike.wilson@startup.io', 'Mike Wilson', 'request_demo', 'web', true, 'Startup founder, interested in AI features'),
  
  -- Support inquiry from 4 days ago
  ('test-visitor-005', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '20 minutes', 'support_inquiry', 30, 'support@client.com', 'Support User', NULL, 'web', true, 'Existing customer with questions'),
  
  -- High-intent consultation request from 5 days ago
  ('test-visitor-006', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '1 hour', 'consulting_inquiry', 85, 'enterprise@bigcorp.com', 'Enterprise Buyer', 'book_consultation', 'web', true, 'Fortune 500 company exploring options'),
  
  -- Feature request from 6 days ago
  ('test-visitor-007', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '30 minutes', 'feature_inquiry', 50, 'product@agency.com', 'Agency Manager', NULL, 'web', true, 'Digital agency evaluating for clients'),
  
  -- Partnership inquiry from a week ago
  ('test-visitor-008', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '40 minutes', 'partnership_vendor', 80, 'partner@vendor.com', 'Partner Manager', 'partner_application', 'web', true, 'Potential integration partner');

-- Add utterances (conversation transcript) for the high-value lead
WITH high_value_session AS (
  SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-001' LIMIT 1
)
INSERT INTO public.utterances (session_id, speaker, text, ts)
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
    ('agent', 'Perfect! I have noted your email. Our enterprise team will reach out within 24 hours to schedule your demo. Is there anything specific you would like us to cover?', NOW() - INTERVAL '2 hours' + INTERVAL '1 minute 35 seconds'),
    ('visitor', 'We need API access and the ability to train on our own data', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes'),
    ('agent', 'Noted! Full API access and custom model training are included in our enterprise plan. I have added these requirements to your demo request.', NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes 5 seconds')
) AS t(speaker, text, ts);

-- Add utterances for the medium-value lead
WITH medium_value_session AS (
  SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-002' LIMIT 1
)
INSERT INTO public.utterances (session_id, speaker, text, ts)
SELECT 
  medium_value_session.id,
  speaker,
  text,
  ts
FROM medium_value_session, (
  VALUES 
    ('visitor', 'What are your pricing plans?', NOW() - INTERVAL '1 day 3 hours'),
    ('agent', 'We offer three main pricing tiers: Starter at $99/month, Professional at $499/month, and Enterprise with custom pricing. Which features are most important for your use case?', NOW() - INTERVAL '1 day 3 hours' + INTERVAL '5 seconds'),
    ('visitor', 'I need voice transcription and basic AI responses', NOW() - INTERVAL '1 day 3 hours' + INTERVAL '30 seconds'),
    ('agent', 'The Professional plan would be perfect for you. It includes unlimited voice transcription, AI-powered responses, and integrations with popular tools. Would you like to start with a free trial?', NOW() - INTERVAL '1 day 3 hours' + INTERVAL '35 seconds'),
    ('visitor', 'Let me think about it and discuss with my team', NOW() - INTERVAL '1 day 3 hours' + INTERVAL '1 minute'),
    ('agent', 'Of course! Take your time. Would you like me to send you more detailed information about our Professional plan?', NOW() - INTERVAL '1 day 3 hours' + INTERVAL '1 minute 5 seconds')
) AS t(speaker, text, ts);

-- Add extracts (structured data) for sessions
WITH session_extract_data AS (
  SELECT id, final_intent, lead_score FROM public.sessions WHERE visitor_id LIKE 'test-%'
)
INSERT INTO public.extracts (session_id, intent, confidence, entities, lead_score)
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
FROM session_extract_data;

-- Add summaries for high-value sessions
WITH high_value_sessions AS (
  SELECT id FROM public.sessions WHERE visitor_id LIKE 'test-%' AND lead_score >= 70
)
INSERT INTO public.summaries (session_id, executive_summary, action_items, crm_payload)
SELECT 
  sessions.id,
  CASE 
    WHEN sessions.id = (SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-001' LIMIT 1)
    THEN 'High-value enterprise lead interested in AI voice assistant for customer support. Budget: $50k/year. Needs API access and custom training.'
    WHEN sessions.id = (SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-004' LIMIT 1)
    THEN 'Startup founder requesting demo. Interested in AI features for customer engagement.'
    WHEN sessions.id = (SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-006' LIMIT 1)
    THEN 'Fortune 500 company exploring enterprise options. High potential for large-scale deployment.'
    WHEN sessions.id = (SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-008' LIMIT 1)
    THEN 'Potential integration partner interested in API collaboration and white-label solutions.'
    ELSE 'Qualified lead showing strong interest in our solution.'
  END,
  CASE 
    WHEN sessions.id = (SELECT id FROM public.sessions WHERE visitor_id = 'test-visitor-001' LIMIT 1)
    THEN '[{"owner": "sales", "text": "Schedule enterprise demo within 24 hours", "priority": "high"}, {"owner": "solutions", "text": "Prepare custom training documentation", "priority": "medium"}]'::jsonb
    ELSE '[{"owner": "sales", "text": "Follow up within 48 hours", "priority": "medium"}]'::jsonb
  END,
  jsonb_build_object(
    'lead_status', 'qualified',
    'next_step', 'demo_scheduled',
    'potential_value', CASE WHEN sessions.lead_score >= 85 THEN 'high' ELSE 'medium' END
  )
FROM high_value_sessions, public.sessions 
WHERE high_value_sessions.id = sessions.id;

-- Add some events for analytics
WITH all_sessions AS (
  SELECT id FROM public.sessions WHERE visitor_id LIKE 'test-%'
)
INSERT INTO public.events (session_id, kind, payload)
SELECT 
  all_sessions.id,
  kind,
  payload
FROM all_sessions, (
  VALUES 
    ('page_view', '{"page": "/", "duration": 5}'::jsonb),
    ('feature_explored', '{"feature": "voice_demo", "interaction_time": 30}'::jsonb),
    ('cta_viewed', '{"cta": "schedule_demo", "shown_after": 60}'::jsonb)
) AS t(kind, payload);

-- Output summary
SELECT 
  'Test Data Created:' as status,
  COUNT(*) as sessions_created,
  COUNT(CASE WHEN lead_score >= 70 THEN 1 END) as high_value_leads,
  AVG(lead_score) as avg_lead_score
FROM public.sessions 
WHERE visitor_id LIKE 'test-%';