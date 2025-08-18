-- Fix sessions table RLS policies to prevent unauthorized access to customer data
-- Drop existing conflicting policies and create clear, secure ones

-- Drop existing policies that may have conflicts
DROP POLICY IF EXISTS "sessions_admin_owner_modify_permissive" ON public.sessions;
DROP POLICY IF EXISTS "sessions_admin_owner_read_permissive" ON public.sessions;
DROP POLICY IF EXISTS "sessions_deny_non_admin_restrictive" ON public.sessions;
DROP POLICY IF EXISTS "sessions_deny_public_access_restrictive" ON public.sessions;

-- Create explicit restrictive policy to deny ALL public access
CREATE POLICY "sessions_deny_public_access_restrictive" 
ON public.sessions 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Create explicit restrictive policy requiring authentication and admin/owner role
CREATE POLICY "sessions_require_admin_owner_restrictive" 
ON public.sessions 
FOR ALL 
USING (auth.uid() IS NOT NULL AND get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])) 
WITH CHECK (auth.uid() IS NOT NULL AND get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text]));