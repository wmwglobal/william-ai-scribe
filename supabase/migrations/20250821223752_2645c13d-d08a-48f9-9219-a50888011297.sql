-- Add explicit anonymous denial policy for sessions table to prevent unauthorized access to customer data
-- This addresses the security finding about customer contact information potentially being stolen

-- First, ensure we have a restrictive policy that explicitly denies anonymous access
CREATE POLICY "sessions_deny_anonymous_access"
ON public.sessions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Also add a comment to document the security measure
COMMENT ON POLICY "sessions_deny_anonymous_access" ON public.sessions 
IS 'Security policy: Explicitly deny all anonymous access to sessions table containing sensitive customer contact information (email, contact_name, etc.)';

-- Verify that authenticated users can only access via admin/owner validation
-- The existing policies should handle this, but let's ensure it's clear
-- (No additional policy needed as the existing restrictive policies already handle this)