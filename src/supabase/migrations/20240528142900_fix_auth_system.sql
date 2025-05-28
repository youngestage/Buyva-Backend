-- First, ensure the user_role type exists
DO $$
BEGIN
  -- Drop the type if it exists to avoid conflicts
  DROP TYPE IF EXISTS public.user_role CASCADE;
  
  -- Create the type
  CREATE TYPE public.user_role AS ENUM ('customer', 'vendor', 'admin');
  
  -- Grant usage on the type to necessary roles
  GRANT USAGE ON TYPE public.user_role TO anon, authenticated, service_role;
END $$;

-- Update the profiles table to use the correct type
DO $$
BEGIN
  -- Add the role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'profiles' 
                AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'customer';
  ELSE
    -- If the column exists, alter its type if needed
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role') = 'text' THEN
      
      -- Convert text to user_role
      ALTER TABLE public.profiles 
      ALTER COLUMN role TYPE public.user_role 
      USING (
        CASE 
          WHEN role = 'admin' THEN 'admin'::public.user_role
          WHEN role = 'vendor' THEN 'vendor'::public.user_role
          ELSE 'customer'::public.user_role
        END
      );
    END IF;
  END IF;
  
  -- Ensure the column has a default value
  ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer';
  
  -- Ensure the column is not nullable
  ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
END $$;

-- Update the handle_new_user function to use the correct type
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

-- Update the trigger for new user signups
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

-- Update RLS policies
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
    USING (
      EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'::public.user_role
      )
    );
END $$;

-- Update role check functions
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

-- Create a function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
