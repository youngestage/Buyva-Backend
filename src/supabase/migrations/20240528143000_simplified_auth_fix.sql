-- Drop existing policies and functions to avoid conflicts
DO $$
BEGIN
  -- Drop policies
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
  
  -- Drop trigger and function
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS public.handle_new_user();
  DROP FUNCTION IF EXISTS public.generate_username(TEXT);
  DROP FUNCTION IF EXISTS public.is_admin();
  DROP FUNCTION IF EXISTS public.is_vendor();
  DROP FUNCTION IF EXISTS public.is_customer();
  DROP FUNCTION IF EXISTS public.get_user_role();
  
  -- Drop the type if it exists
  DROP TYPE IF EXISTS public.user_role CASCADE;
END $$;

-- Create the user_role type
CREATE TYPE public.user_role AS ENUM ('customer', 'vendor', 'admin');

-- Create or update the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a function to generate a username from email
CREATE OR REPLACE FUNCTION public.generate_username(email TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  unique_username TEXT;
  counter INT := 0;
BEGIN
  base_username := split_part(email, '@', 1);
  unique_username := base_username;
  
  -- Keep trying until we find a unique username
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = unique_username) LOOP
    counter := counter + 1;
    unique_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN unique_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user profile
  INSERT INTO public.profiles (
    id, 
    username, 
    full_name, 
    avatar_url, 
    role
  )
  VALUES (
    NEW.id,
    public.generate_username(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'admin'::public.user_role
      WHEN (NEW.raw_user_meta_data->>'role')::TEXT = 'vendor' THEN 'vendor'::public.user_role
      ELSE 'customer'::public.user_role
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
-- Allow public read access to profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'::public.user_role
    )
  );

-- Role check functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'vendor'::public.user_role
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'customer'::public.user_role
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Add comments to document the schema
COMMENT ON TABLE public.profiles IS 'Stores user profile information that extends the auth.users table';
COMMENT ON COLUMN public.profiles.id IS 'References the auth.users table';
COMMENT ON COLUMN public.profiles.username IS 'Unique username for the user';
COMMENT ON COLUMN public.profiles.full_name IS ''User''s full name';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user''s avatar image';
COMMENT ON COLUMN public.profiles.role IS 'User role (customer, vendor, admin)';
COMMENT ON COLUMN public.profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp when the profile was last updated';
