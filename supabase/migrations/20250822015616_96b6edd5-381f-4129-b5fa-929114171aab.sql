-- Comprehensive security fix for sensitive customer data protection
-- This addresses multiple critical security findings about exposed sensitive data

-- First, let's ensure we have proper role checking without recursion
-- Update the admin check function to be more secure
CREATE OR REPLACE FUNCTION public.is_admin_or_owner_with_validation()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Only allow if user is authenticated AND has admin/owner role AND user exists
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY (ARRAY['owner'::text, 'admin'::text])
    AND id IS NOT NULL
  ) AND auth.uid() IS NOT NULL AND auth.role() = 'authenticated';
$function$;

-- Create a restrictive function that only allows service role for edge functions
CREATE OR REPLACE FUNCTION public.is_service_role_only()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT auth.role() = 'service_role'::text;
$function$;

-- === MEMORIES TABLE - Critical CRM Data Protection ===
-- Drop existing policies to recreate with better security
DROP POLICY IF EXISTS "memories_secure_access" ON public.memories;

-- Explicitly deny all anonymous access to memories
CREATE POLICY "memories_deny_anonymous" 
ON public.memories 
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Allow only authenticated admin/owner users to access memories
CREATE POLICY "memories_admin_access" 
ON public.memories 
FOR ALL TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Allow service role for edge functions (with additional validation in functions)
CREATE POLICY "memories_service_access" 
ON public.memories 
FOR ALL TO service_role
USING (is_service_role_only())
WITH CHECK (is_service_role_only());

-- === SESSIONS TABLE - Customer Contact Information Protection ===
DROP POLICY IF EXISTS "sessions_final_secure_access" ON public.sessions;

-- Deny anonymous access to sessions
CREATE POLICY "sessions_deny_anonymous" 
ON public.sessions 
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Allow only admin/owner access to customer contact data
CREATE POLICY "sessions_admin_access" 
ON public.sessions 
FOR ALL TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Service role access for edge functions
CREATE POLICY "sessions_service_access" 
ON public.sessions 
FOR ALL TO service_role
USING (is_service_role_only())
WITH CHECK (is_service_role_only());

-- === UTTERANCES TABLE - Private Conversation Protection ===
DROP POLICY IF EXISTS "utterances_secure_access" ON public.utterances;

-- Deny anonymous access to conversations
CREATE POLICY "utterances_deny_anonymous" 
ON public.utterances 
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Allow only admin/owner access to customer conversations
CREATE POLICY "utterances_admin_access" 
ON public.utterances 
FOR ALL TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Service role access for edge functions
CREATE POLICY "utterances_service_access" 
ON public.utterances 
FOR ALL TO service_role
USING (is_service_role_only())
WITH CHECK (is_service_role_only());

-- === SUMMARIES TABLE - Business Intelligence Protection ===
-- Clean up existing policies
DROP POLICY IF EXISTS "summaries_admin_owner_only_complete_access" ON public.summaries;
DROP POLICY IF EXISTS "summaries_deny_anonymous_completely" ON public.summaries;

-- Deny anonymous access to business intelligence
CREATE POLICY "summaries_deny_anonymous" 
ON public.summaries 
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Allow only admin/owner access to business summaries
CREATE POLICY "summaries_admin_access" 
ON public.summaries 
FOR ALL TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Service role access for edge functions
CREATE POLICY "summaries_service_access" 
ON public.summaries 
FOR ALL TO service_role
USING (is_service_role_only())
WITH CHECK (is_service_role_only());

-- === EXTRACTS TABLE - Lead Data Protection ===
DROP POLICY IF EXISTS "extracts_secure_access" ON public.extracts;

-- Deny anonymous access to lead data
CREATE POLICY "extracts_deny_anonymous" 
ON public.extracts 
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Allow only admin/owner access to lead extracts
CREATE POLICY "extracts_admin_access" 
ON public.extracts 
FOR ALL TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Service role access for edge functions
CREATE POLICY "extracts_service_access" 
ON public.extracts 
FOR ALL TO service_role
USING (is_service_role_only())
WITH CHECK (is_service_role_only());

-- === EVENTS TABLE - Activity Log Protection ===
DROP POLICY IF EXISTS "events_secure_access" ON public.events;

-- Deny anonymous access to activity logs
CREATE POLICY "events_deny_anonymous" 
ON public.events 
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Allow only admin/owner access to events
CREATE POLICY "events_admin_access" 
ON public.events 
FOR ALL TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Service role access for edge functions
CREATE POLICY "events_service_access" 
ON public.events 
FOR ALL TO service_role
USING (is_service_role_only())
WITH CHECK (is_service_role_only());

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Add additional security: Ensure profiles table is also protected
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure no one can access profile data without proper authentication
DROP POLICY IF EXISTS "profiles_admin_owner_only_complete_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_deny_anonymous_completely" ON public.profiles;

CREATE POLICY "profiles_deny_anonymous" 
ON public.profiles 
FOR ALL TO anon
USING (false)
WITH CHECK (false);

-- Allow users to see their own profile, admins to see all
CREATE POLICY "profiles_authenticated_access" 
ON public.profiles 
FOR ALL TO authenticated
USING (
  -- Users can access their own profile OR they are admin/owner
  auth.uid() = id OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text])
)
WITH CHECK (
  -- Users can modify their own profile OR they are admin/owner
  auth.uid() = id OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text])
);