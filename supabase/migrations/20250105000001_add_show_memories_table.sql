-- Create show_memories table for podcast mode
CREATE TABLE IF NOT EXISTS show_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_number INTEGER NOT NULL DEFAULT 1,
  session_id TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  themes TEXT[] DEFAULT '{}',
  best_moments JSONB[] DEFAULT '{}',
  callbacks JSONB[] DEFAULT '{}',
  audience_engagement FLOAT DEFAULT 5.0,
  show_duration INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_show_memories_episode ON show_memories(episode_number);
CREATE INDEX IF NOT EXISTS idx_show_memories_session ON show_memories(session_id);
CREATE INDEX IF NOT EXISTS idx_show_memories_created ON show_memories(created_at);

-- RLS policies
ALTER TABLE show_memories ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can make this more restrictive later)
CREATE POLICY "Allow all operations on show_memories" ON show_memories
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);