-- Fix critical security vulnerability: Restrict profile visibility
-- Remove the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new, secure policy that only allows users to view:
-- 1. Their own profile
-- 2. Profiles of accepted friends
-- 3. Admin/owner access (already handled by existing "profiles_authenticated_access" policy)
CREATE POLICY "Users can view own profile and accepted friends" 
ON public.profiles 
FOR SELECT 
USING (
  -- User can view their own profile
  auth.uid() = id 
  OR 
  -- User can view profiles of accepted friends (bidirectional friendship check)
  EXISTS (
    SELECT 1 FROM public.friends 
    WHERE status = 'accepted' 
    AND (
      (user_id = auth.uid() AND friend_id = profiles.id) OR 
      (user_id = profiles.id AND friend_id = auth.uid())
    )
  )
);