-- Remove dangerous public access policies on sessions table
-- These policies allow anyone to read customer emails, names, and other PII

DROP POLICY IF EXISTS "Allow public session read" ON public.sessions;
DROP POLICY IF EXISTS "Allow public session creation" ON public.sessions; 
DROP POLICY IF EXISTS "Allow public session update" ON public.sessions;

-- Also remove public policies on related tables that could expose sensitive data
DROP POLICY IF EXISTS "Allow public utterance read" ON public.utterances;
DROP POLICY IF EXISTS "Allow public utterance creation" ON public.utterances;
DROP POLICY IF EXISTS "Allow public extract read" ON public.extracts;
DROP POLICY IF EXISTS "Allow public extract creation" ON public.extracts;
DROP POLICY IF EXISTS "Allow public event read" ON public.events;
DROP POLICY IF EXISTS "Allow public event creation" ON public.events;

-- Keep the existing owner_admins_* policies intact - they provide proper access control
-- The edge functions use service role access so they won't be affected by these changes