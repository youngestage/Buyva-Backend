import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Helper function to handle Supabase errors
const handleSupabaseError = (error, res) => {
  console.error('Supabase error:', error);
  
  if (!error.status) {
    return res.status(500).json({ 
      message: 'Database error',
      error: error.message 
    });
  }
  
  // Handle specific error codes if needed
  switch (error.code) {
    case '23505': // Unique violation
      return res.status(409).json({ 
        message: 'Resource already exists',
        error: error.message 
      });
    case '42501': // Insufficient privilege
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        error: error.message 
      });
    default:
      return res.status(400).json({ 
        message: 'Database operation failed',
        error: error.message 
      });
  }
};

// Helper to get the current user from the request
const getCurrentUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'No token provided' };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid token' };
  }

  // Get additional user data from the public.users table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    return { user: null, error: 'User profile not found' };
  }

  return { user: userProfile, error: null };
};

export { supabase, handleSupabaseError, getCurrentUser };
