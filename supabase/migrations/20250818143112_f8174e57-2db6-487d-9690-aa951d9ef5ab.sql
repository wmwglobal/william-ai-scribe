-- Fix security issue: Add proper RLS policies for sessions table to prevent data exposure
-- Current issue: Only restrictive policies exist, which may allow public access if role function fails

-- Drop existing policies to replace with secure ones
DROP POLICY IF EXISTS "owner_admins_read_all_sessions" ON public.sessions;
DROP POLICY IF EXISTS "owner_admins_modify_all_sessions" ON public.sessions;

-- Add PERMISSIVE policy that explicitly allows only authenticated admin/owner users to read
CREATE POLICY "sessions_admin_owner_read_permissive"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
);

-- Add PERMISSIVE policy that explicitly allows only authenticated admin/owner users to modify
CREATE POLICY "sessions_admin_owner_modify_permissive"
ON public.sessions
FOR ALL
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
);

-- Add RESTRICTIVE policy that explicitly denies access to all other users
CREATE POLICY "sessions_deny_public_access_restrictive"
ON public.sessions
AS RESTRICTIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Add RESTRICTIVE policy that denies access if user role is not admin/owner
CREATE POLICY "sessions_deny_non_admin_restrictive" 
ON public.sessions
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
)
WITH CHECK (
  get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
);