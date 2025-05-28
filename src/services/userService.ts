import { StatusCodes } from 'http-status-codes';
import { supabase } from '../config/supabase.js';
import { UserRole } from '../types/user.js';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Get user by ID
 * @param userId - The user's ID
 * @returns User object
 * @throws {Error} If user is not found or there's an error
 */
export const getUserById = async (userId: string): Promise<UserProfile> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(error.message || 'Error fetching user');
    }

    if (!data) {
      const error = new Error('User not found');
      (error as any).statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param userId - The user's ID
 * @param updates - Object containing fields to update
 * @returns Updated user object
 * @throws {Error} If update fails
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserProfile> => {
  try {
    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Error updating user profile');
    }

    if (!updatedUser) {
      throw new Error('Failed to update user profile');
    }

    return updatedUser as UserProfile;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
};

/**
 * Delete user account
 * @param userId - The user's ID
 * @returns True if deletion was successful
 * @throws {Error} If deletion fails
 */
export const deleteUserAccount = async (userId: string): Promise<boolean> => {
  const client = supabase;
  
  try {
    // Start a transaction
    await client.rpc('begin');

    // Delete from auth.users will cascade to public.profiles due to ON DELETE CASCADE
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Commit the transaction
    await client.rpc('commit');
    
    return true;
  } catch (error) {
    // Rollback in case of error
    await client.rpc('rollback');
    console.error('Error in deleteUserAccount:', error);
    throw error;
  }
};

/**
 * Get all users (admin only)
 * @param page - Page number (1-based)
 * @param limit - Number of items per page
 * @returns Paginated list of users
 * @throws {Error} If there's an error fetching users
 */
export const getAllUsers = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResult<UserProfile>> => {
  try {
    const startIndex = (page - 1) * limit;
    
    // Get total count and paginated results in a single query
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .range(startIndex, startIndex + limit - 1);

    if (error) throw error;
    if (count === null) {
      throw new Error('Failed to get user count');
    }

    return {
      data: data as UserProfile[],
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    };
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};

/**
 * Update user role (admin only)
 * @param userId - The user's ID
 * @param role - New role
 * @returns Updated user object
 * @throws {Error} If update fails or user not found
 */
export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<UserProfile> => {
  try {
    // First check if the user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      const error = new Error('User not found');
      (error as any).statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }

    // Update the role
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Error updating user role');
    }

    if (!updatedUser) {
      throw new Error('Failed to update user role');
    }

    return updatedUser as UserProfile;
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    throw error;
  }
};

export default {
  getUserById,
  updateUserProfile,
  deleteUserAccount,
  getAllUsers,
  updateUserRole,
};
