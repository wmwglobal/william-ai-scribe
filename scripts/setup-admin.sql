-- Setup script for creating admin user and necessary tables
-- Run this in your Supabase SQL editor

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Create policy to allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        new.id,
        new.email,
        CASE 
            -- First user becomes owner
            WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'owner'
            -- Set specific email as admin (change this to your email)
            WHEN new.email IN ('admin@example.com', 'your-email@example.com') THEN 'admin'
            ELSE 'viewer'
        END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing users to have profiles (if any exist without profiles)
INSERT INTO public.profiles (id, email, role)
SELECT 
    id,
    email,
    CASE 
        WHEN email IN ('admin@example.com', 'your-email@example.com') THEN 'admin'
        WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'owner'
        ELSE 'viewer'
    END
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- IMPORTANT: After running this script, you need to:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Invite User" 
-- 3. Enter your email address
-- 4. You'll receive an email with a link to set your password
-- 5. After setting password, you can login at /auth

-- Alternatively, you can create a user directly:
-- Go to Authentication > Users > Add User > Enter email and password

-- To make an existing user an admin, run:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';