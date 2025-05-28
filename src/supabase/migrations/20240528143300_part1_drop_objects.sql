-- First part: Drop existing objects to avoid conflicts
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
  
  -- Drop the profiles table if it exists
  DROP TABLE IF EXISTS public.profiles CASCADE;
END $$;
