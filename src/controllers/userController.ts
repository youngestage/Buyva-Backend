import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { 
  getUserById, 
  updateUserProfile, 
  deleteUserAccount, 
  getAllUsers, 
  updateUserRole 
} from '../services/userService.js';
import { 
  DeleteUserRequest, 
  GetUserRequest, 
  UpdateProfileRequest, 
  UpdateRoleRequest,
  UserResponse
} from '../types/userController.js';
import { UserProfile, UserRole } from '../types/user.js';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
export const getCurrentUser = async (
  req: Request,
  res: Response<UserResponse>,
  next: NextFunction
): Promise<Response<UserResponse> | void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await getUserById(userId);
    return res.status(StatusCodes.OK).json({
      success: true,
      user
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PATCH /api/users/me
 * @access  Private
 */
export const updateProfile = async (
  req: UpdateProfileRequest,
  res: Response<UserResponse>,
  next: NextFunction
): Promise<Response<UserResponse> | void> => {
  try {
    const { name, first_name, last_name, avatar_url } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at' | 'role'>> = {};
    
    // Handle name updates (support both name and first_name/last_name)
    if (name) {
      // For backward compatibility, split the name into first_name and last_name
      const [firstName, ...lastNames] = name.split(' ');
      updates.first_name = firstName;
      updates.last_name = lastNames.join(' ');
      updates.full_name = name; // Keep full_name in sync
    } else {
      // Use first_name and last_name if provided
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      
      // Update full_name if either first or last name is updated
      if (first_name !== undefined || last_name !== undefined) {
        updates.full_name = [
          updates.first_name || req.user?.first_name || '',
          updates.last_name || req.user?.last_name || ''
        ].join(' ').trim();
      }
    }
    
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const updatedUser = await updateUserProfile(userId, updates);
    return res.status(StatusCodes.OK).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = async (
  req: Request,
  res: Response<UserResponse>,
  next: NextFunction
): Promise<Response<UserResponse> | void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    const result = await getAllUsers(page, limit);
    const pages = Math.ceil(result.total / result.limit);
    
    return res.status(StatusCodes.OK).json({
      success: true,
      users: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role (admin only)
 * @route   PATCH /api/users/:id/role
 * @access  Private/Admin
 */
export const updateRole = async (
  req: Request,
  res: Response<UserResponse>,
  next: NextFunction
): Promise<Response<UserResponse> | void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    // Validate the role is a valid UserRole
    if (!['customer', 'vendor', 'admin'].includes(role)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid role. Must be one of: customer, vendor, admin'
      });
    }
    
    const updatedUser = await updateUserRole(id, role as UserRole);
    return res.status(StatusCodes.OK).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUser = async (
  req: GetUserRequest,
  res: Response<UserResponse>,
  next: NextFunction
): Promise<Response<UserResponse> | void> => {
  try {
    const user = await getUserById(req.params.id);
    return res.status(StatusCodes.OK).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (
  req: DeleteUserRequest,
  res: Response<UserResponse>,
  next: NextFunction
): Promise<Response<UserResponse> | void> => {
  try {
    // Prevent deleting self
    if (req.user?.id === req.params.id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await deleteUserAccount(req.params.id);
    return res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete current user's account
 * @route   DELETE /api/users/me
 * @access  Private
 */
export const deleteAccount = async (
  req: Request,
  res: Response<UserResponse>,
  next: NextFunction
): Promise<Response<UserResponse> | void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    await deleteUserAccount(userId);
    return res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

export default {
  getCurrentUser,
  updateProfile,
  getUsers,
  updateRole,
  getUser,
  deleteUser,
  deleteAccount
};
