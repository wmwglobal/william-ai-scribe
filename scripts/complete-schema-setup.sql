-- Complete Schema Setup and Data Seeding Script
-- This script creates the scribe schema, migrates tables, and seeds test data

-- Step 1: Create the scribe schema
CREATE SCHEMA IF NOT EXISTS scribe;

-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA scribe TO anon, authenticated;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Step 2: Create all tables in scribe schema

-- Users & profiles
CREATE TABLE IF NOT EXISTS scribe.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role text CHECK (role IN ('owner','admin','viewer')) DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sessions (one per visitor conversation)
CREATE TABLE IF NOT EXISTS scribe.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  visitor_id text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  channel text CHECK (channel IN ('web')) DEFAULT 'web',
  consent boolean DEFAULT false,
  final_intent text,
  lead_score int DEFAULT 0,
  email text,
  contact_name text,
  cta_chosen text,
  notes text,
  session_secret text,
  current_mode text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Utterances (streamed transcript)
CREATE TABLE IF NOT EXISTS scribe.utterances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES scribe.sessions(id) ON DELETE CASCADE,
  speaker text CHECK (speaker IN ('visitor','agent')) NOT NULL,
  text text NOT NULL,
  ts timestamptz DEFAULT now(),
  asr_conf numeric,
  audio_url text
);

-- Structured extraction snapshots
CREATE TABLE IF NOT EXISTS scribe.extracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES scribe.sessions(id) ON DELETE CASCADE,
  utterance_id uuid REFERENCES scribe.utterances(id),
  intent text,
  confidence numeric,
  entities jsonb,
  followup_actions jsonb,
  lead_score int,
  created_at timestamptz DEFAULT now()
);

-- Summaries (post-call & rolling)
CREATE TABLE IF NOT EXISTS scribe.summaries (
  session_id uuid PRIMARY KEY REFERENCES scribe.sessions(id) ON DELETE CASCADE,
  executive_summary text,
  action_items jsonb,
  crm_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Events (analytics)
CREATE TABLE IF NOT EXISTS scribe.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES scribe.sessions(id) ON DELETE CASCADE,
  kind text,
  payload jsonb,
  ts timestamptz DEFAULT now()
);

-- RAG tables
CREATE TABLE IF NOT EXISTS scribe.rag_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scribe.rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES scribe.rag_collections(id) ON DELETE CASCADE,
  title text,
  source_url text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scribe.rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES scribe.rag_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  token_count int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scribe.rag_embeddings (
  chunk_id uuid PRIMARY KEY REFERENCES scribe.rag_chunks(id) ON DELETE CASCADE,
  embedding vector(1536)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON scribe.sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON scribe.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_lead_score ON scribe.sessions(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_utterances_session_id ON scribe.utterances(session_id);
CREATE INDEX IF NOT EXISTS idx_utterances_ts ON scribe.utterances(ts DESC);
CREATE INDEX IF NOT EXISTS idx_extracts_session_id ON scribe.extracts(session_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON scribe.events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_kind ON scribe.events(kind);
CREATE INDEX IF NOT EXISTS idx_events_ts ON scribe.events(ts DESC);

-- Step 4: Temporarily disable RLS for data insertion
ALTER TABLE scribe.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.utterances DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.extracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.events DISABLE ROW LEVEL SECURITY;

-- Step 5: Clear any existing test data
DELETE FROM scribe.utterances WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.summaries WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.extracts WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.events WHERE session_id IN (SELECT id FROM scribe.sessions WHERE visitor_id LIKE 'test-%');
DELETE FROM scribe.sessions WHERE visitor_id LIKE 'test-%';

-- Step 6: Insert test sessions
INSERT INTO scribe.sessions (visitor_id, started_at, ended_at, final_intent, lead_score, email, contact_name, cta_chosen, channel, consent, notes, created_at)
VALUES 
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

-- Step 7: Add sample conversations
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
    ('agent', 'Hello! I would be happy to help you explore our AI voice assistant solutions.', NOW() - INTERVAL '2 hours' + INTERVAL '5 seconds'),
    ('visitor', 'We need something that can handle customer support calls at scale', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'),
    ('agent', 'Our enterprise solution is perfect for high-volume customer support.', NOW() - INTERVAL '2 hours' + INTERVAL '35 seconds')
) AS t(speaker, text, ts);

-- Step 8: Add summaries
INSERT INTO scribe.summaries (session_id, executive_summary, action_items)
SELECT 
  id,
  CASE 
    WHEN visitor_id = 'test-visitor-001' THEN 'High-value enterprise lead. Budget: $50k/year.'
    WHEN visitor_id = 'test-visitor-004' THEN 'Startup founder requesting demo.'
    WHEN visitor_id = 'test-visitor-006' THEN 'Fortune 500 company exploring options.'
    ELSE 'Qualified lead showing interest.'
  END,
  '[{"owner": "sales", "text": "Follow up within 24 hours", "priority": "high"}]'::jsonb
FROM scribe.sessions 
WHERE visitor_id LIKE 'test-%' AND lead_score >= 70;

-- Step 9: Re-enable RLS
ALTER TABLE scribe.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.events ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for anonymous access
DO $$ 
BEGIN
  -- Allow anonymous users to create sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sessions' 
    AND policyname = 'anon_create_sessions' 
    AND schemaname = 'scribe'
  ) THEN
    CREATE POLICY "anon_create_sessions"
    ON scribe.sessions FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;

  -- Allow anonymous users to read sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sessions' 
    AND policyname = 'anon_read_sessions' 
    AND schemaname = 'scribe'
  ) THEN
    CREATE POLICY "anon_read_sessions"
    ON scribe.sessions FOR SELECT
    TO anon
    USING (true);
  END IF;

  -- Allow anonymous users to create utterances
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'utterances' 
    AND policyname = 'anon_create_utterances' 
    AND schemaname = 'scribe'
  ) THEN
    CREATE POLICY "anon_create_utterances"
    ON scribe.utterances FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;

  -- Allow anonymous users to read utterances
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'utterances' 
    AND policyname = 'anon_read_utterances' 
    AND schemaname = 'scribe'
  ) THEN
    CREATE POLICY "anon_read_utterances"
    ON scribe.utterances FOR SELECT
    TO anon
    USING (true);
  END IF;

  -- Allow anonymous users to create events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'anon_create_events' 
    AND schemaname = 'scribe'
  ) THEN
    CREATE POLICY "anon_create_events"
    ON scribe.events FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;

  -- Allow anonymous users to create summaries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'summaries' 
    AND policyname = 'anon_create_summaries' 
    AND schemaname = 'scribe'
  ) THEN
    CREATE POLICY "anon_create_summaries"
    ON scribe.summaries FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;

  -- Allow anonymous users to create extracts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'extracts' 
    AND policyname = 'anon_create_extracts' 
    AND schemaname = 'scribe'
  ) THEN
    CREATE POLICY "anon_create_extracts"
    ON scribe.extracts FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;

-- Step 11: Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA scribe TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA scribe TO anon, authenticated;
GRANT USAGE, CREATE ON SCHEMA scribe TO anon, authenticated;

-- Step 12: Create views in public schema for backward compatibility
CREATE OR REPLACE VIEW public.sessions AS SELECT * FROM scribe.sessions;
CREATE OR REPLACE VIEW public.utterances AS SELECT * FROM scribe.utterances;
CREATE OR REPLACE VIEW public.summaries AS SELECT * FROM scribe.summaries;
CREATE OR REPLACE VIEW public.events AS SELECT * FROM scribe.events;
CREATE OR REPLACE VIEW public.extracts AS SELECT * FROM scribe.extracts;
CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM scribe.profiles;

-- Grant permissions on views
GRANT SELECT ON public.sessions TO anon, authenticated;
GRANT SELECT ON public.utterances TO anon, authenticated;
GRANT SELECT ON public.summaries TO anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.extracts TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Step 13: Verify the setup
SELECT 
  'Setup Complete!' as status,
  COUNT(*) as sessions_created,
  COUNT(CASE WHEN lead_score >= 70 THEN 1 END) as high_value_leads,
  AVG(lead_score)::int as avg_lead_score,
  (SELECT COUNT(*) FROM scribe.utterances) as utterances_count,
  (SELECT COUNT(*) FROM scribe.summaries) as summaries_count
FROM scribe.sessions 
WHERE visitor_id LIKE 'test-%';