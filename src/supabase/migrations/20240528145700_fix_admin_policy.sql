-- Fix the infinite recursion in admin policy
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
  
  -- Recreate the admin policy without causing recursion
  CREATE POLICY "Admins can manage all profiles"
    ON public.profiles
    USING (
      -- Use the is_admin() function instead of a direct query to profiles
      public.is_admin()
    );
    
  -- Ensure the policy is applied to all operations
  ALTER POLICY "Admins can manage all profiles" ON public.profiles
    USING (public.is_admin());
    
  -- Also ensure the update policy is properly scoped
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  
  CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);
    
  -- Ensure public read access
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  
  CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles
    FOR SELECT
    USING (true);
END $$;
