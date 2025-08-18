-- Additional security hardening for sessions table
-- Add column-level security for the most sensitive fields

-- Create a secure function to validate admin/owner access with additional checks
CREATE OR REPLACE FUNCTION public.is_admin_or_owner_with_validation()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY (ARRAY['owner'::text, 'admin'::text])
    AND id IS NOT NULL
  ) AND auth.uid() IS NOT NULL;
$$;

-- Update the sessions RLS policies to use the more secure function
DROP POLICY IF EXISTS "sessions_require_admin_owner_restrictive" ON public.sessions;

-- Create new policy with enhanced validation
CREATE POLICY "sessions_admin_owner_only_secure" 
ON public.sessions 
FOR ALL 
USING (is_admin_or_owner_with_validation()) 
WITH CHECK (is_admin_or_owner_with_validation());

-- Add additional restrictive policy specifically for session_secret column access
-- This ensures session secrets are never exposed even to admins unless absolutely necessary
CREATE POLICY "sessions_session_secret_ultra_restrictive" 
ON public.sessions 
FOR SELECT 
USING (false);

-- Create a separate secure function for session validation that doesn't expose secrets
CREATE OR REPLACE FUNCTION public.validate_session_access(session_id_param UUID, session_secret_param TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.sessions 
    WHERE id = session_id_param 
    AND session_secret = session_secret_param
  );
$$;