-- Create action_items table for tracking action items from conversations
CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  owner TEXT CHECK (owner IN ('you', 'agent', 'prospect')) DEFAULT 'you',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  category TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_action_items_session_id ON public.action_items(session_id);
CREATE INDEX idx_action_items_status ON public.action_items(status);
CREATE INDEX idx_action_items_priority ON public.action_items(priority);
CREATE INDEX idx_action_items_owner ON public.action_items(owner);
CREATE INDEX idx_action_items_due_date ON public.action_items(due_date);
CREATE INDEX idx_action_items_created_at ON public.action_items(created_at DESC);

-- Add RLS policies
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Policy for inserting action items (anyone can create for their session)
CREATE POLICY "Users can create action items for their sessions"
  ON public.action_items
  FOR INSERT
  WITH CHECK (true);

-- Policy for viewing action items
CREATE POLICY "Users can view all action items"
  ON public.action_items
  FOR SELECT
  USING (true);

-- Policy for updating action items
CREATE POLICY "Users can update action items"
  ON public.action_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy for deleting action items
CREATE POLICY "Users can delete action items"
  ON public.action_items
  FOR DELETE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_action_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_action_items_updated_at_trigger
  BEFORE UPDATE ON public.action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_action_items_updated_at();

-- Add performance indexes for memories table if not exists
CREATE INDEX IF NOT EXISTS idx_memories_session_id ON public.memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_scope ON public.memories(scope);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON public.memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON public.memories(last_accessed DESC);