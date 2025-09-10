-- Script to delete ALL session data from the scribe schema
-- WARNING: This will permanently delete all session data!

-- First, check what we're about to delete
DO $$
DECLARE
  session_count INTEGER;
  utterance_count INTEGER;
  summary_count INTEGER;
  event_count INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO session_count FROM scribe.sessions;
  SELECT COUNT(*) INTO utterance_count FROM scribe.utterances;
  SELECT COUNT(*) INTO summary_count FROM scribe.summaries;
  SELECT COUNT(*) INTO event_count FROM scribe.events;
  
  -- Show what will be deleted
  RAISE NOTICE 'About to delete:';
  RAISE NOTICE '  - % sessions', session_count;
  RAISE NOTICE '  - % utterances', utterance_count;
  RAISE NOTICE '  - % summaries', summary_count;
  RAISE NOTICE '  - % events', event_count;
END $$;

-- Temporarily disable RLS to ensure we can delete everything
ALTER TABLE scribe.utterances DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.extracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_collections DISABLE ROW LEVEL SECURITY;

-- Delete all data (in correct order due to foreign keys)
-- First delete tables that reference utterances
DELETE FROM scribe.extracts;  -- This references utterances, so delete first
DELETE FROM scribe.utterances; -- Now safe to delete utterances

-- Delete other session-related data
DELETE FROM scribe.summaries;
DELETE FROM scribe.events;

-- Delete RAG data if any
DELETE FROM scribe.rag_embeddings;
DELETE FROM scribe.rag_chunks;
DELETE FROM scribe.rag_documents;
DELETE FROM scribe.rag_collections;

-- Finally delete sessions
DELETE FROM scribe.sessions;

-- Re-enable RLS
ALTER TABLE scribe.utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe.rag_collections ENABLE ROW LEVEL SECURITY;

-- Verify deletion
SELECT 
  'Data Deletion Complete!' as status,
  (SELECT COUNT(*) FROM scribe.sessions) as sessions_remaining,
  (SELECT COUNT(*) FROM scribe.utterances) as utterances_remaining,
  (SELECT COUNT(*) FROM scribe.summaries) as summaries_remaining,
  (SELECT COUNT(*) FROM scribe.events) as events_remaining,
  CASE 
    WHEN (SELECT COUNT(*) FROM scribe.sessions) = 0 
    THEN 'SUCCESS: All data deleted'
    ELSE 'WARNING: Some data may remain'
  END as result;