-- Fix conflicting RLS policies and simplify security model
-- This addresses the security finding about conflicting restrictive rules

-- Drop existing conflicting policies on sessions table
DROP POLICY IF EXISTS "sessions_admin_owner_only_complete_access" ON public.sessions;
DROP POLICY IF EXISTS "sessions_deny_anonymous_access" ON public.sessions;
DROP POLICY IF EXISTS "sessions_restrict_to_admin_owner_only" ON public.sessions;

-- Create single, clear policy for sessions table
-- Allow access only to authenticated admin/owner users and service role
CREATE POLICY "sessions_secure_access" 
ON public.sessions 
FOR ALL 
USING (
  -- Allow admin/owner users OR service role (for edge functions)
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
)
WITH CHECK (
  -- Same check for inserts/updates
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
);

-- Ensure RLS is enabled
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Fix other tables with similar conflicting policies
-- Clean up memories table policies
DROP POLICY IF EXISTS "memories_admin_owner_only_complete_access" ON public.memories;
DROP POLICY IF EXISTS "memories_deny_anonymous_completely" ON public.memories;
DROP POLICY IF EXISTS "memories_restrict_to_admin_owner_only" ON public.memories;

CREATE POLICY "memories_secure_access" 
ON public.memories 
FOR ALL 
USING (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
)
WITH CHECK (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
);

-- Clean up utterances table policies  
DROP POLICY IF EXISTS "utterances_admin_owner_only_complete_access" ON public.utterances;
DROP POLICY IF EXISTS "utterances_restrict_to_admin_owner_only" ON public.utterances;

CREATE POLICY "utterances_secure_access" 
ON public.utterances 
FOR ALL 
USING (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
)
WITH CHECK (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
);

-- Clean up extracts table policies
DROP POLICY IF EXISTS "extracts_admin_owner_only_complete_access" ON public.extracts;
DROP POLICY IF EXISTS "extracts_deny_anonymous_completely" ON public.extracts;

CREATE POLICY "extracts_secure_access" 
ON public.extracts 
FOR ALL 
USING (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
)
WITH CHECK (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
);

-- Clean up events table policies
DROP POLICY IF EXISTS "events_admin_owner_only_complete_access" ON public.events;
DROP POLICY IF EXISTS "events_deny_anonymous_completely" ON public.events;

CREATE POLICY "events_secure_access" 
ON public.events 
FOR ALL 
USING (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
)
WITH CHECK (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
);

-- Ensure all tables have RLS enabled
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;