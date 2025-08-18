-- Add restrictive RLS policies to utterances table to explicitly deny public access
-- This ensures that sensitive conversation data is properly protected

-- Add restrictive policy to deny all public access to utterances
CREATE POLICY "utterances_deny_public_access_restrictive" 
ON public.utterances 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Add restrictive policy to ensure only authenticated admin/owner users can access
CREATE POLICY "utterances_deny_non_admin_restrictive" 
ON public.utterances 
FOR ALL 
USING (auth.uid() IS NOT NULL AND get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])) 
WITH CHECK (auth.uid() IS NOT NULL AND get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text]));