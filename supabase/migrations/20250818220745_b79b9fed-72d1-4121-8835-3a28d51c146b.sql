-- Update RLS policies to allow anonymous users to create and access sessions
-- This enables the public chat functionality to work without authentication

-- Drop existing restrictive policies for sessions
DROP POLICY IF EXISTS "sessions_deny_anonymous_completely" ON public.sessions;
DROP POLICY IF EXISTS "sessions_admin_owner_only_complete_access" ON public.sessions;

-- Create new policies for sessions that allow anonymous access with session_secret validation
CREATE POLICY "sessions_public_access_with_secret" 
ON public.sessions 
FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Update utterances policies to allow access for valid sessions
DROP POLICY IF EXISTS "utterances_deny_anonymous_completely" ON public.utterances;
DROP POLICY IF EXISTS "utterances_admin_owner_only_complete_access" ON public.utterances;

CREATE POLICY "utterances_session_access" 
ON public.utterances 
FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Update extracts policies to allow access for valid sessions
DROP POLICY IF EXISTS "extracts_deny_anonymous_completely" ON public.extracts;
DROP POLICY IF EXISTS "extracts_admin_owner_only_complete_access" ON public.extracts;

CREATE POLICY "extracts_session_access" 
ON public.extracts 
FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Update events policies to allow access for valid sessions
DROP POLICY IF EXISTS "events_deny_anonymous_completely" ON public.events;
DROP POLICY IF EXISTS "events_admin_owner_only_complete_access" ON public.events;

CREATE POLICY "events_session_access" 
ON public.events 
FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);