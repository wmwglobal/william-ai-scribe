-- Migration Script: Convert existing OpenAI embeddings to HuggingFace embeddings
-- This script provides options for migrating existing vector data

-- OPTION 1: Update existing memories to mark them as using OpenAI embeddings
-- This is safe and maintains existing functionality
UPDATE public.memories 
SET embedding_provider = 'openai' 
WHERE embedding IS NOT NULL 
AND embedding_provider IS NULL;

-- OPTION 2: Regenerate embeddings using HuggingFace (requires API access)
-- This would need to be done via the application layer since SQL can't call external APIs
-- The application would:
-- 1. Fetch memories with NULL embedding_hf
-- 2. Extract text from summary or content
-- 3. Generate new HuggingFace embeddings
-- 4. Update the embedding_hf column

-- OPTION 3: Clear old embeddings to force regeneration (DESTRUCTIVE - backup first!)
-- Uncomment the lines below only if you want to force regeneration of all embeddings
-- WARNING: This will remove all existing embeddings and they will need to be regenerated

/*
-- Clear existing embeddings to force regeneration
UPDATE public.memories 
SET 
    embedding = NULL,
    embedding_hf = NULL,
    embedding_provider = 'huggingface'
WHERE embedding IS NOT NULL;

-- Add comment to track migration
UPDATE public.memories 
SET 
    tags = COALESCE(tags, ARRAY[]::text[]) || ARRAY['migrated_embeddings']
WHERE embedding IS NULL AND embedding_hf IS NULL;
*/

-- Query to check migration status
SELECT 
    embedding_provider,
    COUNT(*) as count,
    COUNT(embedding) as openai_embeddings,
    COUNT(embedding_hf) as huggingface_embeddings
FROM public.memories 
GROUP BY embedding_provider
ORDER BY embedding_provider;

-- Query to identify memories that need embedding regeneration
SELECT 
    id,
    scope,
    embedding_provider,
    CASE WHEN embedding IS NOT NULL THEN 'openai' ELSE 'none' END as has_openai,
    CASE WHEN embedding_hf IS NOT NULL THEN 'huggingface' ELSE 'none' END as has_huggingface,
    created_at
FROM public.memories 
WHERE 
    (embedding_provider = 'openai' AND embedding IS NULL) OR
    (embedding_provider = 'huggingface' AND embedding_hf IS NULL)
ORDER BY created_at DESC
LIMIT 10;

-- Performance check: verify indexes are being used
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.memories 
WHERE embedding_provider = 'huggingface' 
AND embedding_hf IS NOT NULL
LIMIT 5;