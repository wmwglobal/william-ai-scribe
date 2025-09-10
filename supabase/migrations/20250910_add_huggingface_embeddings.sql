-- Migration: Add HuggingFace embedding support with dual dimensions
-- This allows for zero-downtime migration from OpenAI (1536d) to HuggingFace (1024d)

-- Add new column for HuggingFace embeddings (1024 dimensions)
ALTER TABLE public.memories 
ADD COLUMN embedding_hf vector(1024);

-- Add column to track embedding provider
ALTER TABLE public.memories 
ADD COLUMN embedding_provider text DEFAULT 'openai' CHECK (embedding_provider IN ('openai', 'huggingface'));

-- Create index for HuggingFace embeddings
CREATE INDEX idx_memories_embedding_hf ON public.memories 
USING ivfflat (embedding_hf vector_cosine_ops) 
WITH (lists = 100);

-- Add index for embedding provider for efficient queries
CREATE INDEX idx_memories_embedding_provider ON public.memories(embedding_provider);

-- Create function to get the appropriate embedding column based on provider
CREATE OR REPLACE FUNCTION get_embedding_column(provider text, openai_embedding vector(1536), hf_embedding vector(1024))
RETURNS vector AS $$
BEGIN
    IF provider = 'huggingface' AND hf_embedding IS NOT NULL THEN
        RETURN hf_embedding::vector;
    ELSIF provider = 'openai' AND openai_embedding IS NOT NULL THEN
        RETURN openai_embedding::vector;
    ELSE
        -- Fallback to whatever is available
        IF hf_embedding IS NOT NULL THEN
            RETURN hf_embedding::vector;
        ELSE
            RETURN openai_embedding::vector;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON COLUMN public.memories.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions) - legacy';
COMMENT ON COLUMN public.memories.embedding_hf IS 'HuggingFace BAAI/bge-large-en-v1.5 (1024 dimensions)';
COMMENT ON COLUMN public.memories.embedding_provider IS 'Tracks which embedding service was used';

-- Update the existing RLS policies to include new columns (they inherit from the table policy)

-- Create a view for easier querying with embedding selection
CREATE OR REPLACE VIEW public.memories_with_embeddings AS
SELECT 
    m.*,
    CASE 
        WHEN m.embedding_provider = 'huggingface' AND m.embedding_hf IS NOT NULL THEN m.embedding_hf::vector
        WHEN m.embedding_provider = 'openai' AND m.embedding IS NOT NULL THEN m.embedding::vector
        WHEN m.embedding_hf IS NOT NULL THEN m.embedding_hf::vector
        ELSE m.embedding::vector
    END as active_embedding,
    CASE 
        WHEN m.embedding_provider = 'huggingface' AND m.embedding_hf IS NOT NULL THEN 1024
        WHEN m.embedding_provider = 'openai' AND m.embedding IS NOT NULL THEN 1536
        WHEN m.embedding_hf IS NOT NULL THEN 1024
        ELSE 1536
    END as embedding_dimensions
FROM public.memories m;

-- Grant appropriate permissions to the view
ALTER VIEW public.memories_with_embeddings OWNER TO postgres;
GRANT ALL ON public.memories_with_embeddings TO postgres;
GRANT ALL ON public.memories_with_embeddings TO service_role;

-- Apply RLS to the view (inherits from memories table)
ALTER VIEW public.memories_with_embeddings SET (security_invoker = on);