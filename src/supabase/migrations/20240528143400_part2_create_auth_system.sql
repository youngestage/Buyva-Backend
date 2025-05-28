-- Create the user_role type
CREATE TYPE public.user_role AS ENUM ('customer', 'vendor', 'admin');

-- Create the profiles table
CREATE TABLE public.profiles (
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
