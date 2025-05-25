const { StatusCodes } = require('http-status-codes');
const supabase = require('../config/supabase');

/**
 * Middleware to protect routes - verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: 'Not authorized, no token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token and get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        message: 'Not authorized, invalid token' 
      });
    }

    // Get user profile from the database
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: 'User profile not found' 
      });
    }

    // Attach user to request object
    req.user = userProfile;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(StatusCodes.UNAUTHORIZED).json({ 
      message: 'Not authorized, authentication failed' 
    });
  }
};

/**
 * Middleware to check user roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ 
          status: 'error',
          message: 'Not authenticated' 
        });
      }

      // Get fresh user data to ensure roles are up to date
      const { data: user, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          status: 'error',
          message: 'User not found',
        });
      }

      // Update the user role in the request object
      req.user.role = user.role;

      // If roles are specified and user doesn't have any of them, deny access
      if (roles.length && !roles.includes(user.role)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: 'error',
          message: 'Not authorized to access this resource',
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ message: 'Server error during authorization' });
    }
  };
};

// Middleware to check if user is the owner of a resource
const isOwner = (resourceUserId) => {
  return (req, res, next) => {
    if (req.user.id !== resourceUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Not authorized to access this resource'
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
  isOwner
};
