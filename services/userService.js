const { StatusCodes } = require('http-status-codes');
const supabase = require('../config/supabase');

/**
 * Get user by ID
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} User object
 */
const getUserById = async (userId) => {
  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(error.message || 'Error fetching user');
    }

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }

    return user;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} userId - The user's ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<Object>} Updated user object
 */
const updateUserProfile = async (userId, updates) => {
  try {
    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Error updating user profile');
    }

    return updatedUser;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
};

/**
 * Delete user account
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} True if deletion was successful
 */
const deleteUserAccount = async (userId) => {
  const client = supabase;
  
  try {
    // Start a transaction
    await client.rpc('begin');

    // Delete user from auth
    const { error: authError } = await client.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Delete user from profiles
    const { error: profileError } = await client
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

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
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Number of items per page
 * @returns {Promise<Object>} Paginated list of users
 */
const getAllUsers = async (page = 1, limit = 10) => {
  try {
    const startIndex = (page - 1) * limit;
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get paginated results
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .range(startIndex, startIndex + limit - 1);

    if (error) throw error;

    return {
      data: users,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};

/**
 * Update user role (admin only)
 * @param {string} userId - The user's ID
 * @param {string} role - New role
 * @returns {Promise<Object>} Updated user object
 */
const updateUserRole = async (userId, role) => {
  try {
    // First check if the user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      const error = new Error('User not found');
      error.statusCode = StatusCodes.NOT_FOUND;
      throw error;
    }

    // Update the role
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Error updating user role');
    }

    return updatedUser;
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    throw error;
  }
};

module.exports = {
  getUserById,
  updateUserProfile,
  deleteUserAccount,
  getAllUsers,
  updateUserRole
};
