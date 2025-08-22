-- Fix summaries table RLS to protect business intelligence data
-- Add policy allowing users to access only their own session summaries

CREATE POLICY "summaries_user_own_sessions_only" 
ON public.summaries 
FOR SELECT
TO authenticated
USING (
  -- Allow access only to summaries for sessions created by the authenticated user
  EXISTS (
    SELECT 1 
    FROM public.sessions 
    WHERE sessions.id = summaries.session_id 
    AND sessions.created_by = auth.uid()
    AND sessions.created_at > now() - interval '24 hours' -- Additional TTL security layer
  )
);

-- Add policy for users to create summaries (for automated processes tied to their sessions)
CREATE POLICY "summaries_user_create_own_sessions" 
ON public.summaries 
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow creation only for sessions owned by the authenticated user
  EXISTS (
    SELECT 1 
    FROM public.sessions 
    WHERE sessions.id = summaries.session_id 
    AND sessions.created_by = auth.uid()
    AND sessions.created_at > now() - interval '24 hours'
  )
);

-- Ensure no UPDATE/DELETE policies for regular users (only admins can modify)
-- This protects the integrity of business intelligence data