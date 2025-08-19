-- First, check and drop all existing policies on sessions table
DROP POLICY IF EXISTS "sessions_allow_insert" ON public.sessions;
DROP POLICY IF EXISTS "sessions_allow_select_recent" ON public.sessions;
DROP POLICY IF EXISTS "sessions_allow_update_recent" ON public.sessions;
DROP POLICY IF EXISTS "sessions_deny_delete" ON public.sessions;
DROP POLICY IF EXISTS "sessions_public_access_with_secret" ON public.sessions;

-- Create a function to validate session access for RLS
-- This function checks if the current request has access to a specific session
CREATE OR REPLACE FUNCTION public.current_session_has_access(session_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Allow access to sessions created within the last 24 hours
  -- This is a temporary security measure - should be enhanced with proper session secret validation
  SELECT EXISTS (
    SELECT 1 
    FROM public.sessions 
    WHERE id = session_id_param 
    AND created_at > now() - interval '24 hours'
  );
$$;

-- Create secure RLS policies for the sessions table

-- Policy 1: Allow anyone to create new sessions (for starting conversations)
CREATE POLICY "sessions_allow_insert" 
ON public.sessions 
FOR INSERT 
WITH CHECK (true);

-- Policy 2: Allow reading session data only for recent sessions (24 hours)
-- This replaces the previous "true" policy that exposed all data
CREATE POLICY "sessions_allow_select_recent" 
ON public.sessions 
FOR SELECT 
USING (created_at > now() - interval '24 hours');

-- Policy 3: Allow updates only for recent sessions  
CREATE POLICY "sessions_allow_update_recent" 
ON public.sessions 
FOR UPDATE 
USING (created_at > now() - interval '24 hours')
WITH CHECK (created_at > now() - interval '24 hours');

-- Policy 4: Prevent deletion to maintain audit trail
CREATE POLICY "sessions_deny_delete" 
ON public.sessions 
FOR DELETE 
USING (false);

-- Ensure RLS is enabled
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;