const { StatusCodes } = require('http-status-codes');
const supabase = require('../config/supabase');

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  const { email, password, first_name, last_name, role = 'customer' } = req.body;
  const full_name = `${first_name} ${last_name}`.trim();

  try {
    // Validate role
    if (role && !['customer', 'vendor'].includes(role)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
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
        message: 'User already exists' 
      });
    }

    // Create user in Supabase Auth with role in user_metadata
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          full_name,
          role // This will be used by the database trigger
        },
        emailRedirectTo: process.env.CLIENT_URL || 'http://localhost:3000/login'
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    // Return the user data (Supabase will send a confirmation email)
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Signup successful! Please check your email to confirm your account.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      message: error.message || 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });

    if (error) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: 'Error fetching user profile' 
      });
    }

    res.json({
      user: userProfile,
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error during login'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getProfile = async (req, res) => {
  try {
    // Get user ID from the authenticated request
    const userId = req.user.id;

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: 'Error fetching user profile' 
      });
    }

    res.json(userProfile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error fetching profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    
    res.json(updatedProfile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error updating profile'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/me
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Delete from profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error deleting account'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    res.status(StatusCodes.OK).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || 'Error during logout'
    });
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  logout
};