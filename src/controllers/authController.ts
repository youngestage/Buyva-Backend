import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { supabase } from '../config/supabase.js';
import { AuthResponse, LoginRequest, SignupRequest, UpdateProfileRequest } from '../types/auth.js';
import { UserProfile } from '../types/user.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (
  req: SignupRequest,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<Response<AuthResponse> | void> => {
  const { email, password, full_name, first_name, last_name, role = 'customer', ...otherFields } = req.body;
  
  // Combine first_name and last_name if full_name is not provided
  const userFullName = full_name || `${first_name || ''} ${last_name || ''}`.trim() || 'New User';
  
  // Remove any undefined or empty values from other fields
  const cleanOtherFields = Object.fromEntries(
    Object.entries(otherFields).filter(([_, v]) => v !== undefined && v !== '')
  );

  try {
    // Validate role
    if (role && !['customer', 'vendor'].includes(role)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false,
        message: 'Invalid role. Must be either customer or vendor' 
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // Create user in Supabase Auth with user metadata
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          full_name: userFullName,
          role, // This will be used by the database trigger
          ...cleanOtherFields // Include any additional fields
        },
        emailRedirectTo: process.env.CLIENT_URL || 'http://localhost:3000/login'
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    // Return the user data (Supabase will send a confirmation email)
    const currentTime = new Date().toISOString();
    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Signup successful! Please check your email to confirm your account.',
      user: {
        id: authData.user?.id || '',
        email: authData.user?.email || '',
        full_name: userFullName,
        role,
        created_at: currentTime,
        updated_at: currentTime,
        avatar_url: null
      } as UserProfile
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      message: error.message || 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (
  req: LoginRequest,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<Response<AuthResponse> | void> => {
  const { email, password } = req.body;

  try {
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });

    if (error) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user?.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: 'Error fetching user profile' 
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      user: userProfile as UserProfile,
      session: data.session
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      message: error.message || 'Error during login'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getProfile = async (
  req: Request,
  res: Response<UserProfile | { message: string }>,
  next: NextFunction
): Promise<Response<UserProfile | { message: string }> | void> => {
  try {
    // Get user ID from the authenticated request
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: 'Not authenticated' 
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: 'Error fetching user profile' 
      });
    }

    return res.status(StatusCodes.OK).json(userProfile as UserProfile);
  } catch (error: any) {
    console.error('Get profile error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error fetching profile'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
export const updateProfile = async (
  req: UpdateProfileRequest,
  res: Response<UserProfile | { message: string }>,
  next: NextFunction
): Promise<Response<UserProfile | { message: string }> | void> => {
  try {
    const userId = req.user?.id;
    const { first_name, last_name, ...otherUpdates } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: 'Not authenticated' 
      });
    }

    // Combine first_name and last_name into full_name if either is provided
    const updates: Record<string, any> = { ...otherUpdates };
    
    if (first_name !== undefined || last_name !== undefined) {
      // If either name part is provided, we need to construct the full_name
      // First, get the current profile to see the existing full_name
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      
      // Split the current full_name to get existing parts
      const currentFullName = currentProfile?.full_name || '';
      const currentNameParts = currentFullName.split(' ');
      const currentFirstName = first_name !== undefined ? first_name : currentNameParts[0] || '';
      const currentLastName = last_name !== undefined ? last_name : currentNameParts.slice(1).join(' ') || '';
      
      // Combine the names, handling cases where either might be empty
      updates.full_name = `${currentFirstName} ${currentLastName}`.trim();
    }

    // Only proceed with update if there are actual fields to update
    if (Object.keys(updates).length === 0) {
      // If no valid updates, return the current profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      return res.status(StatusCodes.OK).json(currentProfile as UserProfile);
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    
    return res.status(StatusCodes.OK).json(updatedProfile as UserProfile);
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error updating profile'
    });
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/auth/me
 * @access  Private
 */
export const deleteAccount = async (
  req: Request,
  res: Response<{ message: string }>,
  next: NextFunction
): Promise<Response<{ message: string }> | void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: 'Not authenticated' 
      });
    }

    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Delete from profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    return res.status(StatusCodes.NO_CONTENT).send();
  } catch (error: any) {
    console.error('Delete account error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error deleting account'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (
  req: Request,
  res: Response<{ message: string }>,
  next: NextFunction
): Promise<Response<{ message: string }> | void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    return res.status(StatusCodes.OK).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error during logout'
    });
  }
};

export default {
  signup,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  logout
};
