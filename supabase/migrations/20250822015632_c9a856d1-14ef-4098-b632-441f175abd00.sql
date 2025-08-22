-- Fix function search path security warning
-- Update the service role function to have proper search_path security

CREATE OR REPLACE FUNCTION public.is_service_role_only()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.role() = 'service_role'::text;
$function$;