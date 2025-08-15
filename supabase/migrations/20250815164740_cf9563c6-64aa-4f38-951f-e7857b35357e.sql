-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users & profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role text CHECK (role IN ('owner','admin','viewer')) DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sessions (one per visitor conversation)
CREATE TABLE public.sessions (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Utterances (streamed transcript)
CREATE TABLE public.utterances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  speaker text CHECK (speaker IN ('visitor','agent')) NOT NULL,
  text text NOT NULL,
  ts timestamptz DEFAULT now(),
  asr_conf numeric,        -- for visitor utterances
  audio_url text           -- supabase storage path for chunk (optional)
);

-- Structured extraction snapshots (per turn or per recap)
CREATE TABLE public.extracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  utterance_id uuid REFERENCES public.utterances(id),
  intent text,
  confidence numeric,
  entities jsonb,
  followup_actions jsonb,
  lead_score int,
  created_at timestamptz DEFAULT now()
);

-- Summaries (post-call & rolling)
CREATE TABLE public.summaries (
  session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  executive_summary text,
  action_items jsonb,      -- [{owner:'you|agent|prospect', text, due_date}]
  crm_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Events (analytics)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  kind text,               -- session_started, cta_clicked, handoff_requested, etc.
  payload jsonb,
  ts timestamptz DEFAULT now()
);

-- RAG: collections, docs, chunks, embeddings
CREATE TABLE public.rag_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES public.rag_collections(id) ON DELETE CASCADE,
  title text,
  source_url text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  token_count int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.rag_embeddings (
  chunk_id uuid PRIMARY KEY REFERENCES public.rag_chunks(id) ON DELETE CASCADE,
  embedding vector(1536) -- set dim to your model
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for owner/admin access
CREATE POLICY "owner_admins_read_all_profiles"
ON public.profiles FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_profiles"
ON public.profiles FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_sessions"
ON public.sessions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_sessions"
ON public.sessions FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

-- Apply similar policies to other tables
CREATE POLICY "owner_admins_read_all_utterances"
ON public.utterances FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_utterances"
ON public.utterances FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_extracts"
ON public.extracts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_extracts"
ON public.extracts FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_summaries"
ON public.summaries FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_summaries"
ON public.summaries FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_events"
ON public.events FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_events"
ON public.events FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

-- RAG policies
CREATE POLICY "owner_admins_read_all_rag_collections"
ON public.rag_collections FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_rag_collections"
ON public.rag_collections FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_rag_documents"
ON public.rag_documents FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_rag_documents"
ON public.rag_documents FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_rag_chunks"
ON public.rag_chunks FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_rag_chunks"
ON public.rag_chunks FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_rag_embeddings"
ON public.rag_embeddings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_rag_embeddings"
ON public.rag_embeddings FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('screens', 'screens', false);  
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Storage policies for owner/admin access
CREATE POLICY "owner_admins_read_all_audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_audio"
ON storage.objects FOR ALL
USING (bucket_id = 'audio' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_screens"
ON storage.objects FOR SELECT
USING (bucket_id = 'screens' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_screens"
ON storage.objects FOR ALL
USING (bucket_id = 'screens' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_uploads"
ON storage.objects FOR ALL
USING (bucket_id = 'uploads' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_read_all_exports"
ON storage.objects FOR SELECT
USING (bucket_id = 'exports' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

CREATE POLICY "owner_admins_modify_all_exports"
ON storage.objects FOR ALL
USING (bucket_id = 'exports' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();