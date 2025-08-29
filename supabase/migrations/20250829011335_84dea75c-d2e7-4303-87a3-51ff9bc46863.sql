-- Function to promote a user to admin role (can only be called by service role)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Only allow service role to execute this
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Only service role can promote users to admin';
  END IF;
  
  -- Find user by email in auth.users
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = user_email;
  
  IF user_uuid IS NULL THEN
    RETURN 'User not found with email: ' || user_email;
  END IF;
  
  -- Insert or update profile with admin role
  INSERT INTO public.profiles (id, role)
  VALUES (user_uuid, 'admin')
  ON CONFLICT (id) 
  DO UPDATE SET role = 'admin', updated_at = NOW();
  
  RETURN 'User ' || user_email || ' has been promoted to admin';
END;
$$;