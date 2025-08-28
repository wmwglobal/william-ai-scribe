-- Create a table for email signups
CREATE TABLE public.email_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  signup_type TEXT NOT NULL DEFAULT 'waitlist',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
);

-- Enable Row Level Security
ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- Create policies for signup management
CREATE POLICY "Admin can view all signups" 
ON public.email_signups 
FOR SELECT 
USING (is_admin_or_owner_with_validation());

CREATE POLICY "Admin can manage all signups" 
ON public.email_signups 
FOR ALL
USING (is_admin_or_owner_with_validation())
WITH CHECK (is_admin_or_owner_with_validation());

-- Allow service role to insert signups (for edge function)
CREATE POLICY "Service role can insert signups" 
ON public.email_signups 
FOR INSERT 
WITH CHECK (is_service_role_only());

-- Create index for faster lookups
CREATE INDEX idx_email_signups_email ON public.email_signups(email);
CREATE INDEX idx_email_signups_created_at ON public.email_signups(created_at DESC);