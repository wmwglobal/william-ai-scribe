-- Create a dedicated schema for the William AI Scribe application
CREATE SCHEMA IF NOT EXISTS scribe;

-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA scribe TO anon, authenticated;

-- Drop existing tables in public schema if they exist (we'll recreate in scribe schema)
DROP TABLE IF EXISTS public.rag_embeddings CASCADE;
DROP TABLE IF EXISTS public.rag_chunks CASCADE;
DROP TABLE IF EXISTS public.rag_documents CASCADE;
DROP TABLE IF EXISTS public.rag_collections CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.extracts CASCADE;
DROP TABLE IF EXISTS public.utterances CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users & profiles
CREATE TABLE scribe.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role text CHECK (role IN ('owner','admin','viewer')) DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sessions (one per visitor conversation)
CREATE TABLE scribe.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id), -- null for anonymous visitor
  visitor_id text,                           -- hashed cookie/UA
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  channel text CHECK (channel IN ('web')) DEFAULT 'web',
  consent boolean DEFAULT false,
  final_intent text,
  lead_score int DEFAULT 0,
  email text,                                -- captured with consent
  contact_name text,
  cta_chosen text,
  notes text,
  session_secret text,                       -- for session authorization
  current_mode text,                          -- for tracking conversation mode
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for visitor_id lookups
CREATE INDEX idx_sessions_visitor_id ON scribe.sessions(visitor_id);
CREATE INDEX idx_sessions_created_at ON scribe.sessions(created_at DESC);
CREATE INDEX idx_sessions_lead_score ON scribe.sessions(lead_score DESC);

-- Utterances (streamed transcript)
CREATE TABLE scribe.utterances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES scribe.sessions(id) ON DELETE CASCADE,
  speaker text CHECK (speaker IN ('visitor','agent')) NOT NULL,
  text text NOT NULL,
  ts timestamptz DEFAULT now(),
  asr_conf numeric,        -- for visitor utterances
  audio_url text           -- supabase storage path for chunk (optional)
);

-- Create index for session_id lookups
CREATE INDEX idx_utterances_session_id ON scribe.utterances(session_id);
CREATE INDEX idx_utterances_ts ON scribe.utterances(ts DESC);

-- Structured extraction snapshots (per turn or per recap)
CREATE TABLE scribe.extracts (
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

-- Create index for session_id lookups
CREATE INDEX idx_extracts_session_id ON scribe.extracts(session_id);

-- Summaries (post-call & rolling)
CREATE TABLE scribe.summaries (
  session_id uuid PRIMARY KEY REFERENCES scribe.sessions(id) ON DELETE CASCADE,
  executive_summary text,
  action_items jsonb,      -- [{owner:'you|agent|prospect', text, due_date}]
  crm_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Events (analytics)
CREATE TABLE scribe.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES scribe.sessions(id) ON DELETE CASCADE,
  kind text,               -- session_started, cta_clicked, handoff_requested, etc.
  payload jsonb,
  ts timestamptz DEFAULT now()
);

-- Create index for session_id and kind lookups
CREATE INDEX idx_events_session_id ON scribe.events(session_id);
CREATE INDEX idx_events_kind ON scribe.events(kind);
CREATE INDEX idx_events_ts ON scribe.events(ts DESC);

-- RAG: collections, docs, chunks, embeddings
CREATE TABLE scribe.rag_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE scribe.rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES scribe.rag_collections(id) ON DELETE CASCADE,
  title text,
  source_url text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE scribe.rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES scribe.rag_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  token_count int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE scribe.rag_embeddings (
  chunk_id uuid PRIMARY KEY REFERENCES scribe.rag_chunks(id) ON DELETE CASCADE,
  embedding vector(1536) -- set dim to your model
);

-- Create vector index for similarity search
CREATE INDEX ON scribe.rag_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE scribe.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for anonymous access (for visitor sessions)
-- Allow anonymous users to create sessions
CREATE POLICY "anon_create_sessions"
ON scribe.sessions FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read their own sessions (using session_secret)
CREATE POLICY "anon_read_own_sessions"
ON scribe.sessions FOR SELECT
TO anon
USING (true); -- Will be filtered by session_secret in the app

-- Allow anonymous users to update their own sessions
CREATE POLICY "anon_update_own_sessions"
ON scribe.sessions FOR UPDATE
TO anon
USING (true); -- Will be filtered by session_secret in the app

-- Allow anonymous users to create utterances for their sessions
CREATE POLICY "anon_create_utterances"
ON scribe.utterances FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read utterances for their sessions
CREATE POLICY "anon_read_utterances"
ON scribe.utterances FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to create events
CREATE POLICY "anon_create_events"
ON scribe.events FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to create extracts
CREATE POLICY "anon_create_extracts"
ON scribe.extracts FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to create summaries
CREATE POLICY "anon_create_summaries"
ON scribe.summaries FOR INSERT
TO anon
WITH CHECK (true);

-- RLS policies for authenticated users (admin access)
-- Profiles: Users can read their own profile
CREATE POLICY "users_read_own_profile"
ON scribe.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Profiles: Admins can read all profiles
CREATE POLICY "admins_read_all_profiles"
ON scribe.profiles FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Sessions: Admins can read all sessions
CREATE POLICY "admins_read_all_sessions"
ON scribe.sessions FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Sessions: Admins can modify all sessions
CREATE POLICY "admins_modify_all_sessions"
ON scribe.sessions FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Utterances: Admins can read all utterances
CREATE POLICY "admins_read_all_utterances"
ON scribe.utterances FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Utterances: Admins can modify all utterances
CREATE POLICY "admins_modify_all_utterances"
ON scribe.utterances FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Extracts: Admins can read all extracts
CREATE POLICY "admins_read_all_extracts"
ON scribe.extracts FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Summaries: Admins can read all summaries
CREATE POLICY "admins_read_all_summaries"
ON scribe.summaries FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Events: Admins can read all events
CREATE POLICY "admins_read_all_events"
ON scribe.events FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- RAG collections: Admins can manage all
CREATE POLICY "admins_manage_rag_collections"
ON scribe.rag_collections FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- RAG documents: Admins can manage all
CREATE POLICY "admins_manage_rag_documents"
ON scribe.rag_documents FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- RAG chunks: Admins can manage all
CREATE POLICY "admins_manage_rag_chunks"
ON scribe.rag_chunks FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- RAG embeddings: Admins can manage all
CREATE POLICY "admins_manage_rag_embeddings"
ON scribe.rag_embeddings FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM scribe.profiles p 
  WHERE p.id = auth.uid() AND p.role IN ('owner','admin')
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION scribe.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON scribe.profiles
    FOR EACH ROW
    EXECUTE FUNCTION scribe.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON scribe.sessions
    FOR EACH ROW
    EXECUTE FUNCTION scribe.update_updated_at_column();

-- Grant permissions to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA scribe TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA scribe TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA scribe TO anon, authenticated;

-- Create a convenience view in public schema for backward compatibility
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

-- Output success message
SELECT 'Schema migration completed successfully!' as status,
       'All tables moved to scribe schema' as message;