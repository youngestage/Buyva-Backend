import { Request, Response, NextFunction, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { UserRole, UserProfile } from '../types/user.js';
import { AppError } from './errorHandler.js';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

/**
 * Middleware to protect routes - verifies JWT token
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        status: 'error',
        message: 'Not authorized, no token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token and get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ 
        status: 'error',
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
        status: 'error',
        message: 'User profile not found' 
      });
    }

    // Attach user to request object
    req.user = userProfile as UserProfile;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(StatusCodes.UNAUTHORIZED).json({ 
      status: 'error',
      message: 'Not authorized, authentication failed' 
    });
  }
};

/**
 * Middleware to check user roles
 * @param roles - Allowed roles
 */
export const authorize = (...roles: UserRole[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
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
      if (req.user) {
        req.user.role = user.role as UserRole;
      }

      // If roles are specified and user doesn't have any of them, deny access
      if (roles.length > 0 && !roles.includes(user.role as UserRole)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          status: 'error',
          message: 'Not authorized to access this resource',
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        status: 'error',
        message: 'Server error during authorization' 
      });
    }
  };
};

/**
 * Middleware to check if user is the owner of a resource
 * @param resourceUserId - User ID of the resource owner
 */
export const isOwner = (resourceUserId: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (req.user && (req.user.id !== resourceUserId && req.user.role !== 'admin')) {
      return res.status(StatusCodes.FORBIDDEN).json({
        status: 'error',
        message: 'Not authorized to access this resource'
      });
    }
    next();
  };
};

// Only for rendered pages, no errors!
export const isLoggedIn = async (req: Request, res: Response, next: NextFunction) => {
  if (req.cookies?.jwt) {
    try {
      // 1) Verify token
      const decoded = jwt.verify(
        req.cookies.jwt,
        process.env.JWT_SECRET || 'your_jwt_secret'
      ) as jwt.JwtPayload;

      // 2) Check if user still exists
      const { data: user, error } = await supabase.auth.getUser(req.cookies.jwt);
      
      if (error || !user) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      // This would require a passwordChangedAt field in your users table
      // if (user.passwordChangedAt) {
      //   const changedTimestamp = user.passwordChangedAt.getTime() / 1000;
      //   if (decoded.iat < changedTimestamp) {
      //     return next();
      //   }
      // }


      // THERE IS A LOGGED IN USER
      res.locals.user = user;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

/**
 * Restrict certain routes to specific roles
 * @param roles Array of roles that are allowed to access the route
 */
export const restrictTo = (...roles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // roles ['admin', 'vendor']. role='customer'
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

export default {
  protect,
  authorize,
  isOwner,
  isLoggedIn,
  restrictTo
};
