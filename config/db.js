import { supabase, handleSupabaseError } from '../utils/supabase.js';

/**
 * Test the database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) throw error;
    
    console.log('✅ Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error.message);
    
    // Provide more helpful error messages for common connection issues
    if (error.message.includes('Failed to fetch')) {
      console.error('  - Check if your Supabase URL is correct');
      console.error('  - Verify your internet connection');
    } else if (error.message.includes('JWT expired')) {
      console.error('  - Your Supabase JWT token might be expired');
    } else if (error.message.includes('permission denied')) {
      console.error('  - Check your RLS (Row Level Security) policies');
      console.error('  - Verify your Supabase anon key has the correct permissions');
    }
    
    process.exit(1);
  }
};

/**
 * Helper function to safely execute a database query with error handling
 * @param {Function} queryFn - The Supabase query function to execute
 * @param {Object} res - Express response object for error handling
 * @returns {Promise<Object>} The query result or error response
 */
export const safeQuery = async (queryFn, res) => {
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
      error: error.message
    });
  }
};

export { supabase, handleSupabaseError };
