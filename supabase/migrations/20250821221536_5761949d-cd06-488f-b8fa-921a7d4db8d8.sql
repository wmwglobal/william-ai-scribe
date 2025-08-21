-- Fix RLS policy logic: Use RESTRICTIVE policies for proper security

-- Remove the conflicting permissive policies
DROP POLICY IF EXISTS "sessions_deny_anonymous_access" ON public.sessions;
DROP POLICY IF EXISTS "sessions_user_own_access" ON public.sessions;
DROP POLICY IF EXISTS "utterances_deny_anonymous_access" ON public.utterances;
DROP POLICY IF EXISTS "utterances_user_own_session_access" ON public.utterances;
DROP POLICY IF EXISTS "memories_user_own_access" ON public.memories;

-- Create RESTRICTIVE policies that block all access except admin/owner
-- RESTRICTIVE policies use AND logic - all must pass for access to be granted
CREATE POLICY "sessions_restrict_to_admin_owner_only"
ON public.sessions
AS RESTRICTIVE
FOR ALL
TO public
USING (is_admin_or_owner_with_validation() OR auth.role() = 'service_role')
WITH CHECK (is_admin_or_owner_with_validation() OR auth.role() = 'service_role');

CREATE POLICY "utterances_restrict_to_admin_owner_only" 
ON public.utterances
AS RESTRICTIVE
FOR ALL
TO public  
USING (is_admin_or_owner_with_validation() OR auth.role() = 'service_role')
WITH CHECK (is_admin_or_owner_with_validation() OR auth.role() = 'service_role');

CREATE POLICY "memories_restrict_to_admin_owner_only"
ON public.memories
AS RESTRICTIVE  
FOR ALL
TO public
USING (is_admin_or_owner_with_validation() OR auth.role() = 'service_role')
WITH CHECK (is_admin_or_owner_with_validation() OR auth.role() = 'service_role');