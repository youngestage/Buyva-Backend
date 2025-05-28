import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { AppError } from './errorHandler.js';
import { UserProfile } from '../types/user.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // 1) Get token and check if it exists
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    // 3) Check if user still exists
    const { data: user, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4) Check if user changed password after the token was issued
    // This would require a passwordChangedAt field in your users table
    // if (user.passwordChangedAt) {
    //   const changedTimestamp = user.passwordChangedAt.getTime() / 1000;
    //   if (decoded.iat < changedTimestamp) {
    //     return next(
    //       new AppError('User recently changed password! Please log in again.', 401)
    //     );
    //   }
    // }


    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = user.user as UserProfile;
    res.locals.user = user.user;
    next();
  } catch (err) {
    next(err);
  }
};

// Only for rendered pages, no errors!
export const isLoggedIn = async (req: Request, res: Response, next: NextFunction) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify token
      const decoded = jwt.verify(
        req.cookies.jwt,
        process.env.JWT_SECRET || 'your_jwt_secret'
      );

      // 2) Check if user still exists
      const { data: user, error } = await supabase.auth.getUser(req.cookies.jwt);
      
      if (error || !user) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      // if (user.passwordChangedAt) {
      //   const changedTimestamp = user.passwordChangedAt.getTime() / 1000;
      //   if (decoded.iat < changedTimestamp) {
      //     return next();
      // }
      // }


      // THERE IS A LOGGED IN USER
      res.locals.user = user.user;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // roles is an array of allowed roles ['admin', 'lead-guide']
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};
