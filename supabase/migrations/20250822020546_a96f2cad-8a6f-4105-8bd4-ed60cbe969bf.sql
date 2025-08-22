-- Fix profiles RLS policy to prevent recursion
-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Update profiles policy to use the security definer function
DROP POLICY IF EXISTS "profiles_authenticated_access" ON public.profiles;

CREATE POLICY "profiles_authenticated_access" 
ON public.profiles 
FOR ALL
TO authenticated
USING ((auth.uid() = id) OR (get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])))
WITH CHECK ((auth.uid() = id) OR (get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])));