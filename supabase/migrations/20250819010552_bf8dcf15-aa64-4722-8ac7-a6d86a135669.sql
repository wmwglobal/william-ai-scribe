-- Fix critical security vulnerabilities in events, extracts, and sessions tables

-- 1. SECURE EVENTS TABLE
-- Drop the dangerous "ALL USING true" policy that exposes all event data
DROP POLICY IF EXISTS "events_session_access" ON public.events;

-- Create secure admin/owner-only policies for events
CREATE POLICY "events_admin_owner_only_complete_access" 
ON public.events 
FOR ALL 
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "events_deny_anonymous_completely" 
ON public.events 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Ensure RLS is enabled on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. SECURE EXTRACTS TABLE  
-- Drop the dangerous "ALL USING true" policy that exposes all extract data
DROP POLICY IF EXISTS "extracts_session_access" ON public.extracts;

-- Create secure admin/owner-only policies for extracts
CREATE POLICY "extracts_admin_owner_only_complete_access" 
ON public.extracts 
FOR ALL 
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "extracts_deny_anonymous_completely" 
ON public.extracts 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Ensure RLS is enabled on extracts table
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;

-- 3. SECURE SESSIONS TABLE
-- Drop existing policies that allow 24-hour public access
DROP POLICY IF EXISTS "sessions_allow_select_recent" ON public.sessions;
DROP POLICY IF EXISTS "sessions_allow_update_recent" ON public.sessions;
DROP POLICY IF EXISTS "sessions_allow_insert" ON public.sessions;
DROP POLICY IF EXISTS "sessions_deny_delete" ON public.sessions;

-- Create secure admin/owner-only policies for sessions
-- Edge functions will use service role which bypasses RLS
CREATE POLICY "sessions_admin_owner_only_complete_access" 
ON public.sessions 
FOR ALL 
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "sessions_deny_anonymous_completely" 
ON public.sessions 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Ensure RLS is enabled on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. SECURE UTTERANCES TABLE (UPDATE EXISTING POLICIES)
-- Drop existing policies and replace with admin/owner-only access
DROP POLICY IF EXISTS "utterances_allow_insert_recent_sessions" ON public.utterances;
DROP POLICY IF EXISTS "utterances_allow_select_recent_sessions" ON public.utterances;
DROP POLICY IF EXISTS "utterances_allow_update_recent_sessions" ON public.utterances;
DROP POLICY IF EXISTS "utterances_deny_delete" ON public.utterances;

-- Create secure admin/owner-only policies for utterances
-- Edge functions will use service role which bypasses RLS
CREATE POLICY "utterances_admin_owner_only_complete_access" 
ON public.utterances 
FOR ALL 
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "utterances_deny_anonymous_completely" 
ON public.utterances 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Ensure RLS is enabled on utterances table
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;