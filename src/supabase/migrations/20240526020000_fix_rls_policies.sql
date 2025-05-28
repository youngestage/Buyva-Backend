-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Vendors can view customer profiles" ON public.profiles;

-- Create a function to get the current user's role without causing recursion
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT raw_user_meta_data->>'role' 
  FROM auth.users 
  WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow admins to perform any action on profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  USING (current_user_role() = 'admin');

-- Allow vendors to view customer profiles (for order management)
CREATE POLICY "Vendors can view customer profiles"
  ON public.profiles
  FOR SELECT
  USING (current_user_role() = 'vendor' AND role = 'customer');

-- Add a comment to document the RLS policies
COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "Users can update their own profile" ON public.profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "Admins can manage all profiles" ON public.profiles IS 'Allows admins to perform any action on any profile';
COMMENT ON POLICY "Vendors can view customer profiles" ON public.profiles IS 'Allows vendors to view customer profiles for order management';
