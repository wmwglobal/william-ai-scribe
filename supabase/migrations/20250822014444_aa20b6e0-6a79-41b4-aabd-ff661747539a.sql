-- Update RLS policies to handle existing policies gracefully
-- Drop and recreate policies to ensure they're correct

-- Sessions table - ensure single clear policy
DROP POLICY IF EXISTS "sessions_secure_access" ON public.sessions;
DROP POLICY IF EXISTS "sessions_admin_owner_only_complete_access" ON public.sessions;
DROP POLICY IF EXISTS "sessions_deny_anonymous_access" ON public.sessions;
DROP POLICY IF EXISTS "sessions_restrict_to_admin_owner_only" ON public.sessions;

CREATE POLICY "sessions_final_secure_access" 
ON public.sessions 
FOR ALL 
USING (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
)
WITH CHECK (
  is_admin_or_owner_with_validation() OR 
  auth.role() = 'service_role'::text
);

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;