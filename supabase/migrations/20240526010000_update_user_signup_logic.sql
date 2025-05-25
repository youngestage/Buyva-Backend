
-- Update the handle_new_user function to only accept 'customer' or 'vendor' roles from signup
-- and remove the automatic admin assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    -- Only allow 'customer' or 'vendor' role from signup
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'vendor' THEN 'vendor'
      ELSE 'customer'  -- Default to 'customer' if not specified or invalid
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger to ensure it's using the latest function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a comment to document the signup process
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user signups. Only accepts ''customer'' or ''vendor'' roles from signup. Admins must be created manually in the database.';
