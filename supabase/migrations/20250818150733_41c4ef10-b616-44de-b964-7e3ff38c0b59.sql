-- Security hardening: Add explicit restrictive RLS policies for public access denial
-- This creates a defense-in-depth approach to prevent unauthorized access

-- 1. Sessions table - deny public access (critical for session secrets and contact data)
CREATE POLICY "sessions_deny_public_access_restrictive" 
ON public.sessions 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

-- 2. Utterances table - deny public access (critical for conversation privacy)
CREATE POLICY "utterances_deny_public_access_restrictive" 
ON public.utterances 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

-- 3. Events table - deny public access
CREATE POLICY "events_deny_public_access_restrictive" 
ON public.events 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

-- 4. Extracts table - deny public access (business intelligence protection)
CREATE POLICY "extracts_deny_public_access_restrictive" 
ON public.extracts 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

-- 5. Summaries table - deny public access
CREATE POLICY "summaries_deny_public_access_restrictive" 
ON public.summaries 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

-- 6. RAG tables - deny public access (protect knowledge base)
CREATE POLICY "rag_collections_deny_public_access_restrictive" 
ON public.rag_collections 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "rag_documents_deny_public_access_restrictive" 
ON public.rag_documents 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "rag_chunks_deny_public_access_restrictive" 
ON public.rag_chunks 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "rag_embeddings_deny_public_access_restrictive" 
ON public.rag_embeddings 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

-- 7. Add session expiration function
CREATE OR REPLACE FUNCTION public.is_session_valid(session_id uuid, session_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.sessions 
    WHERE id = session_id 
      AND session_secret = is_session_valid.session_secret
      AND created_at > NOW() - INTERVAL '24 hours'
      AND ended_at IS NULL
  );
$$;