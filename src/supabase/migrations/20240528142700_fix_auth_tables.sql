-- Create user_role type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('customer', 'vendor', 'admin');
  END IF;
END $$;

-- Create profiles table if it doesn't exist
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
  suffix TEXT;
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

-- Create or replace the handle_new_user function
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
DO $$
BEGIN
  -- Drop the trigger if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
  
  -- Create the trigger
  EXECUTE 'CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
END $$;

-- RLS Policies for profiles
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
  
  -- Create new policies
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
    USING (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'::public.user_role
    ));
END $$;

-- Create a function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.is_role(role_name public.user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = role_name
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.is_role('admin');
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a function to check if current user is a vendor
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
  SELECT public.is_role('vendor');
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a function to check if current user is a customer
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN AS $$
  SELECT public.is_role('customer');
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
COMMENT ON COLUMN public.profiles.full_name IS 'User''s full name';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user''s avatar image';
COMMENT ON COLUMN public.profiles.role IS 'User role (customer, vendor, admin)';
COMMENT ON COLUMN public.profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp when the profile was last updated';
