-- Fix customer contact information security by adding proper user-scoped RLS policies

-- Add explicit anonymous denial policy for sessions (defense in depth)
CREATE POLICY "sessions_deny_anonymous_access" 
ON public.sessions 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Add explicit anonymous denial policy for utterances (defense in depth)  
CREATE POLICY "utterances_deny_anonymous_access"
ON public.utterances
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Allow authenticated users to access their own sessions
CREATE POLICY "sessions_user_own_access" 
ON public.sessions 
FOR ALL 
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to access utterances from their own sessions
CREATE POLICY "utterances_user_own_session_access"
ON public.utterances
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = utterances.session_id 
    AND sessions.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = utterances.session_id 
    AND sessions.created_by = auth.uid()
  )
);

-- Allow authenticated users to access their own memories (user_id based)
CREATE POLICY "memories_user_own_access"
ON public.memories
FOR ALL
TO authenticated  
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);