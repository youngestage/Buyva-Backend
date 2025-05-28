import { supabase, handleSupabaseError } from '../utils/supabase.js';
import { Response } from 'express';

/**
 * Test the database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export const testConnection = async (): Promise<boolean> => {
  console.log('🔍 Testing Supabase connection...');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Supabase Anon Key:', process.env.SUPABASE_ANON_KEY ? '***' + process.env.SUPABASE_ANON_KEY.slice(-4) : 'Not set');
  
  try {
    // First, try a simple query to test the connection
    // Use a function call to avoid RLS issues
    const { data: isAdmin, error } = await supabase.rpc('is_admin');
      
    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    console.log('✅ Successfully connected to Supabase');
    console.log('Database response:', { isAdmin });
    return true;
  } catch (error: any) {
    console.error('❌ Error connecting to Supabase:');
    console.error('Error details:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      if (error.message.includes('Failed to fetch')) {
        console.error('  - Check if your Supabase URL is correct');
        console.error('  - Verify your internet connection');
      } else if (error.message.includes('JWT')) {
        console.error('  - There might be an issue with your JWT token');
        console.error('  - Check if your SUPABASE_ANON_KEY is correct');
      } else if (error.message.includes('permission denied')) {
        console.error('  - Check your RLS (Row Level Security) policies');
        console.error('  - Verify your Supabase anon key has the correct permissions');
      } else if (error.message.includes('relation "users" does not exist')) {
        console.error('  - The "users" table does not exist in your Supabase database');
        console.error('  - Make sure you have run your database migrations');
      }
    }
    
    process.exit(1);
  }
};

type QueryFunction<T = any> = () => Promise<{
  data: T | null;
  error: any;
  status: number;
  statusText: string;
}>;

/**
 * Helper function to safely execute a database query with error handling
 * @template T - The type of data returned by the query
 * @param {QueryFunction<T>} queryFn - The Supabase query function to execute
 * @param {Response} res - Express response object for error handling
 * @returns {Promise<T | any>} The query result or error response
 */
export const safeQuery = async <T>(
  queryFn: QueryFunction<T>,
  res: Response
): Promise<T | any> => {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      return handleSupabaseError(error, res);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Database query error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database operation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export { supabase, handleSupabaseError };
