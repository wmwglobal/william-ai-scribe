-- Create memories table for conversation memory architecture
CREATE TABLE public.memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid,
  visitor_id text,
  scope text NOT NULL CHECK (scope IN ('short', 'medium', 'long', 'episodic')),
  content jsonb NOT NULL,
  summary text,
  importance integer DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  last_referenced timestamp with time zone DEFAULT now(),
  embedding vector(1536),
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Create policies for memories table - admin/owner only access
CREATE POLICY "memories_admin_owner_only_complete_access" 
ON public.memories 
FOR ALL 
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

CREATE POLICY "memories_deny_anonymous_completely" 
ON public.memories 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Create indexes for efficient retrieval
CREATE INDEX idx_memories_session_id ON public.memories(session_id);
CREATE INDEX idx_memories_user_id ON public.memories(user_id);
CREATE INDEX idx_memories_visitor_id ON public.memories(visitor_id);
CREATE INDEX idx_memories_scope ON public.memories(scope);
CREATE INDEX idx_memories_importance ON public.memories(importance);
CREATE INDEX idx_memories_last_referenced ON public.memories(last_referenced);
CREATE INDEX idx_memories_tags ON public.memories USING GIN(tags);

-- Create vector similarity index for embeddings
CREATE INDEX idx_memories_embedding ON public.memories 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create trigger for updated_at
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();