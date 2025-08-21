-- Security fix: Remove permissive RLS policies that expose private conversations and sessions
-- Drop existing permissive policies that allow public access based on recency

-- Drop permissive sessions policies
DROP POLICY IF EXISTS "sessions_allow_select_recent" ON public.sessions;
DROP POLICY IF EXISTS "sessions_allow_update_recent" ON public.sessions;
DROP POLICY IF EXISTS "sessions_allow_insert" ON public.sessions;

-- Drop permissive utterances policies  
DROP POLICY IF EXISTS "utterances_allow_select_recent_sessions" ON public.utterances;
DROP POLICY IF EXISTS "utterances_allow_update_recent_sessions" ON public.utterances;
DROP POLICY IF EXISTS "utterances_allow_insert_recent_sessions" ON public.utterances;

-- Remove redundant deny policies (they don't override permissive ones anyway)
DROP POLICY IF EXISTS "sessions_deny_anonymous_completely" ON public.sessions;
DROP POLICY IF EXISTS "utterances_deny_anonymous_completely" ON public.utterances;

-- Drop existing admin policies to recreate them properly
DROP POLICY IF EXISTS "sessions_admin_owner_only_complete_access" ON public.sessions;
DROP POLICY IF EXISTS "utterances_admin_owner_only_complete_access" ON public.utterances;

-- Create secure admin/owner-only policies for sessions
CREATE POLICY "sessions_admin_owner_only_complete_access" 
ON public.sessions 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Create secure admin/owner-only policies for utterances
CREATE POLICY "utterances_admin_owner_only_complete_access" 
ON public.utterances 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation()) 
WITH CHECK (is_admin_or_owner_with_validation());

-- Ensure RLS is enabled on both tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;