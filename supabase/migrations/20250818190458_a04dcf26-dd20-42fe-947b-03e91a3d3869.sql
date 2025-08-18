-- Add current_mode column to sessions table for dynamic personality switching
ALTER TABLE public.sessions 
ADD COLUMN current_mode text DEFAULT 'entrepreneur';

-- Create index for better query performance
CREATE INDEX idx_sessions_current_mode ON public.sessions(current_mode);