-- Fix RLS security issues by ensuring all sensitive tables are properly protected

-- First, let's check and fix the sessions table RLS policies
-- Drop existing conflicting policies and create a comprehensive security approach
DROP POLICY IF EXISTS "sessions_admin_owner_only_secure" ON public.sessions;
DROP POLICY IF EXISTS "sessions_deny_public_access_restrictive" ON public.sessions;
DROP POLICY IF EXISTS "sessions_session_secret_ultra_restrictive" ON public.sessions;

-- Create a single, clear restrictive policy for sessions table
-- This ensures ONLY authenticated admin/owner users can access ANY session data
CREATE POLICY "sessions_admin_owner_only_complete_access" 
ON public.sessions 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Completely deny any access to anonymous users
CREATE POLICY "sessions_deny_anonymous_completely" 
ON public.sessions 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Fix utterances table - drop existing and create proper policies
DROP POLICY IF EXISTS "owner_admins_modify_all_utterances" ON public.utterances;
DROP POLICY IF EXISTS "owner_admins_read_all_utterances" ON public.utterances;
DROP POLICY IF EXISTS "utterances_deny_non_admin_restrictive" ON public.utterances;
DROP POLICY IF EXISTS "utterances_deny_public_access_restrictive" ON public.utterances;

-- Create comprehensive utterances protection
CREATE POLICY "utterances_admin_owner_only_complete_access" 
ON public.utterances 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "utterances_deny_anonymous_completely" 
ON public.utterances 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Fix extracts table
DROP POLICY IF EXISTS "owner_admins_modify_all_extracts" ON public.extracts;
DROP POLICY IF EXISTS "owner_admins_read_all_extracts" ON public.extracts;

CREATE POLICY "extracts_admin_owner_only_complete_access" 
ON public.extracts 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "extracts_deny_anonymous_completely" 
ON public.extracts 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Fix summaries table
DROP POLICY IF EXISTS "owner_admins_modify_all_summaries" ON public.summaries;
DROP POLICY IF EXISTS "owner_admins_read_all_summaries" ON public.summaries;

CREATE POLICY "summaries_admin_owner_only_complete_access" 
ON public.summaries 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "summaries_deny_anonymous_completely" 
ON public.summaries 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Fix profiles table
DROP POLICY IF EXISTS "owner_admins_modify_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "owner_admins_read_all_profiles" ON public.profiles;

CREATE POLICY "profiles_admin_owner_only_complete_access" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "profiles_deny_anonymous_completely" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Fix events table
DROP POLICY IF EXISTS "owner_admins_modify_all_events" ON public.events;
DROP POLICY IF EXISTS "owner_admins_read_all_events" ON public.events;

CREATE POLICY "events_admin_owner_only_complete_access" 
ON public.events 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "events_deny_anonymous_completely" 
ON public.events 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Fix RAG tables
DROP POLICY IF EXISTS "owner_admins_modify_all_rag_collections" ON public.rag_collections;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_collections" ON public.rag_collections;

CREATE POLICY "rag_collections_admin_owner_only_complete_access" 
ON public.rag_collections 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "rag_collections_deny_anonymous_completely" 
ON public.rag_collections 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "owner_admins_modify_all_rag_documents" ON public.rag_documents;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_documents" ON public.rag_documents;

CREATE POLICY "rag_documents_admin_owner_only_complete_access" 
ON public.rag_documents 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "rag_documents_deny_anonymous_completely" 
ON public.rag_documents 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "owner_admins_modify_all_rag_chunks" ON public.rag_chunks;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_chunks" ON public.rag_chunks;

CREATE POLICY "rag_chunks_admin_owner_only_complete_access" 
ON public.rag_chunks 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "rag_chunks_deny_anonymous_completely" 
ON public.rag_chunks 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "owner_admins_modify_all_rag_embeddings" ON public.rag_embeddings;
DROP POLICY IF EXISTS "owner_admins_read_all_rag_embeddings" ON public.rag_embeddings;

CREATE POLICY "rag_embeddings_admin_owner_only_complete_access" 
ON public.rag_embeddings 
FOR ALL 
TO authenticated
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "rag_embeddings_deny_anonymous_completely" 
ON public.rag_embeddings 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.utterances FORCE ROW LEVEL SECURITY;
ALTER TABLE public.extracts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.summaries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rag_collections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rag_embeddings FORCE ROW LEVEL SECURITY;