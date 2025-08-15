-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  channel TEXT CHECK (channel IN ('web')) DEFAULT 'web',
  consent BOOLEAN DEFAULT FALSE,
  final_intent TEXT,
  lead_score INT DEFAULT 0,
  email TEXT,
  contact_name TEXT,
  cta_chosen TEXT,
  notes TEXT
);

-- Utterances
CREATE TABLE IF NOT EXISTS public.utterances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  speaker TEXT CHECK (speaker IN ('visitor','agent')) NOT NULL,
  text TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  asr_conf NUMERIC,
  audio_url TEXT
);

-- Extracts
CREATE TABLE IF NOT EXISTS public.extracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  utterance_id UUID REFERENCES public.utterances(id),
  intent TEXT,
  confidence NUMERIC,
  entities JSONB,
  followup_actions JSONB,
  lead_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_utterances_session ON public.utterances(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_extracts_session ON public.extracts(session_id, created_at);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;

-- Public access policies for the chat feature
CREATE POLICY "Allow public session creation" ON public.sessions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow public session read" ON public.sessions
  FOR SELECT USING (TRUE);

CREATE POLICY "Allow public session update" ON public.sessions
  FOR UPDATE USING (TRUE);

CREATE POLICY "Allow public utterance creation" ON public.utterances
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow public utterance read" ON public.utterances
  FOR SELECT USING (TRUE);

CREATE POLICY "Allow public extract creation" ON public.extracts
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow public extract read" ON public.extracts
  FOR SELECT USING (TRUE);