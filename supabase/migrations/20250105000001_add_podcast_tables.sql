-- Create tables for podcast mode functionality

-- Show memories table for storing episode data
CREATE TABLE IF NOT EXISTS public.show_memories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  memory_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_show_memories_session_id ON public.show_memories(session_id);
CREATE INDEX IF NOT EXISTS idx_show_memories_episode_number ON public.show_memories(episode_number DESC);
CREATE INDEX IF NOT EXISTS idx_show_memories_created_at ON public.show_memories(created_at DESC);

-- Add RLS policies
ALTER TABLE public.show_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view show memories"
  ON public.show_memories
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create show memories"
  ON public.show_memories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update show memories"
  ON public.show_memories
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.show_memories TO anon;
GRANT ALL ON public.show_memories TO authenticated;
GRANT ALL ON public.show_memories TO service_role;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_show_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_show_memories_updated_at_trigger
  BEFORE UPDATE ON public.show_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_show_memories_updated_at();