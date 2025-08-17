-- Add session authorization and fix security issues

-- 1. Add session_secret column for authorization
ALTER TABLE public.sessions ADD COLUMN session_secret TEXT;

-- 2. Add foreign key constraints for data integrity
ALTER TABLE public.utterances 
ADD CONSTRAINT fk_utterances_session_id 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.events 
ADD CONSTRAINT fk_events_session_id 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.extracts 
ADD CONSTRAINT fk_extracts_session_id 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.extracts 
ADD CONSTRAINT fk_extracts_utterance_id 
FOREIGN KEY (utterance_id) REFERENCES public.utterances(id) ON DELETE CASCADE;

ALTER TABLE public.summaries 
ADD CONSTRAINT fk_summaries_session_id 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- 3. Fix RLS recursion on profiles by creating security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Update RLS policies to use the security definer function instead of direct table access
DROP POLICY IF EXISTS "owner_admins_read_all_events" ON public.events;
DROP POLICY IF EXISTS "owner_admins_modify_all_events" ON public.events;
DROP POLICY IF EXISTS "owner_admins_read_all_extracts" ON public.extracts;
DROP POLICY IF EXISTS "owner_admins_modify_all_extracts" ON public.extracts;
DROP POLICY IF EXISTS "owner_admins_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "owner_admins_modify_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_chunks" ON public.rag_chunks;
DROP POLICY IF EXISTS "owner_admins_modify_all_rag_chunks" ON public.rag_chunks;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_collections" ON public.rag_collections;
DROP POLICY IF EXISTS "owner_admins_modify_all_rag_collections" ON public.rag_collections;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_documents" ON public.rag_documents;
DROP POLICY IF EXISTS "owner_admins_modify_all_rag_documents" ON public.rag_documents;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_embeddings" ON public.rag_embeddings;
DROP POLICY IF EXISTS "owner_admins_modify_all_rag_embeddings" ON public.rag_embeddings;
DROP POLICY IF EXISTS "owner_admins_read_all_sessions" ON public.sessions;
DROP POLICY IF EXISTS "owner_admins_modify_all_sessions" ON public.sessions;
DROP POLICY IF EXISTS "owner_admins_read_all_summaries" ON public.summaries;
DROP POLICY IF EXISTS "owner_admins_modify_all_summaries" ON public.summaries;
DROP POLICY IF EXISTS "owner_admins_read_all_utterances" ON public.utterances;
DROP POLICY IF EXISTS "owner_admins_modify_all_utterances" ON public.utterances;

-- Recreate policies using the security definer function
CREATE POLICY "owner_admins_read_all_events" ON public.events
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_events" ON public.events
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_extracts" ON public.extracts
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_extracts" ON public.extracts
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_profiles" ON public.profiles
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_profiles" ON public.profiles
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_rag_chunks" ON public.rag_chunks
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_rag_chunks" ON public.rag_chunks
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_rag_collections" ON public.rag_collections
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_rag_collections" ON public.rag_collections
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_rag_documents" ON public.rag_documents
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_rag_documents" ON public.rag_documents
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_rag_embeddings" ON public.rag_embeddings
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_rag_embeddings" ON public.rag_embeddings
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_sessions" ON public.sessions
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_sessions" ON public.sessions
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_summaries" ON public.summaries
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_summaries" ON public.summaries
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_read_all_utterances" ON public.utterances
FOR SELECT USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "owner_admins_modify_all_utterances" ON public.utterances
FOR ALL USING (public.get_current_user_role() = ANY (ARRAY['owner', 'admin']));