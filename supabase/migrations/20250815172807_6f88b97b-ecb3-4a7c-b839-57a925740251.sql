-- Add events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  kind TEXT,
  payload JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for events
CREATE INDEX IF NOT EXISTS idx_events_session ON public.events(session_id, ts);

-- Enable RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for events
CREATE POLICY "Allow public event creation" ON public.events
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow public event read" ON public.events
  FOR SELECT USING (TRUE);