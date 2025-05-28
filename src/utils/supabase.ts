import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import 'dotenv/config';

// Define types for the Supabase client with our database schema
type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
          // Add other user fields as needed
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          updated_at?: string;
          // Add other user fields as needed
        };
        Update: {
          id?: string;
          email?: string;
          updated_at?: string;
          // Add other user fields as needed
        };
      };
      // Add other tables as needed
    };
  };
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

// Create a single supabase client for interacting with your database
export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Define error response type
interface ErrorResponse {
  message: string;
  error?: string;
}

// Define user profile type
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'customer' | 'vendor' | 'admin';
  created_at: string;
  updated_at: string;
}

// Helper function to handle Supabase errors
export const handleSupabaseError = (
  error: any,
  res: Response
): Response<ErrorResponse> => {
  console.error('Supabase error:', error);
  
  if (!error.status) {
    return res.status(500).json({ 
      message: 'Database error',
      error: error.message 
    });
  }
  
  // Handle specific error codes
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
export const getCurrentUser = async (
  req: Request
): Promise<{ user: UserProfile | null; error: string | null }> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'No token provided' };
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { user: null, error: userError?.message || 'Invalid token' };
    }

    // Get additional user data from the profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { user: null, error: 'User profile not found' };
    }

    // Map the profile data to the UserProfile type
    const userData: UserProfile = {
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      updated_at: userProfile.updated_at,
      // Add any additional fields from the profiles table
      ...userProfile
    };

    return { user: userData, error: null };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return { user: null, error: 'Failed to authenticate user' };
  }
};

// Export types for use in other files
export type { Database };

// Default export for backward compatibility
export default {
  supabase,
  handleSupabaseError,
  getCurrentUser,
};
