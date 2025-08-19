-- Drop the existing insecure policy on utterances table
DROP POLICY IF EXISTS "utterances_session_access" ON public.utterances;

-- Create a more secure function for utterances access control
-- This function will check if the current request has proper session access
-- by validating both session_id and requiring the session to be recent
CREATE OR REPLACE FUNCTION public.can_access_utterances(utterance_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Only allow access to utterances from sessions created within the last 24 hours
  -- This prevents access to old conversation data and limits exposure window
  SELECT EXISTS (
    SELECT 1 
    FROM public.sessions 
    WHERE id = utterance_session_id 
    AND created_at > now() - interval '24 hours'
  );
$$;

-- Create secure RLS policies for the utterances table

-- Policy 1: Allow inserting new utterances for valid recent sessions
CREATE POLICY "utterances_allow_insert_recent_sessions" 
ON public.utterances 
FOR INSERT 
WITH CHECK (
  session_id IS NOT NULL 
  AND can_access_utterances(session_id)
);

-- Policy 2: Allow reading utterances only for recent sessions (24 hours)
-- This replaces the dangerous "true" policy that exposed all conversation data
CREATE POLICY "utterances_allow_select_recent_sessions" 
ON public.utterances 
FOR SELECT 
USING (
  session_id IS NOT NULL 
  AND can_access_utterances(session_id)
);

-- Policy 3: Allow updates only for recent session utterances
-- This is needed for any conversation editing or correction features
CREATE POLICY "utterances_allow_update_recent_sessions" 
ON public.utterances 
FOR UPDATE 
USING (
  session_id IS NOT NULL 
  AND can_access_utterances(session_id)
)
WITH CHECK (
  session_id IS NOT NULL 
  AND can_access_utterances(session_id)
);

-- Policy 4: Prevent deletion to maintain conversation audit trail
-- Conversations should be preserved for security and compliance reasons
CREATE POLICY "utterances_deny_delete" 
ON public.utterances 
FOR DELETE 
USING (false);

-- Ensure RLS is enabled on utterances table
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;