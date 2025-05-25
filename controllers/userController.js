const { StatusCodes } = require('http-status-codes');
const { 
  getUserById, 
  updateUserProfile, 
  deleteUserAccount, 
  getAllUsers, 
  updateUserRole 
} = require('../services/userService');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    res.status(StatusCodes.OK).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PATCH /api/users/me
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar_url } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (avatar_url) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }

    const updatedUser = await updateUserProfile(req.user.id, updates);
    res.status(StatusCodes.OK).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const users = await getAllUsers(page, limit);
    res.status(StatusCodes.OK).json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role (admin only)
 * @route   PATCH /api/users/:id/role
 * @access  Private/Admin
 */
const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;
    
    const updatedUser = await updateUserRole(id, role);
    res.status(StatusCodes.OK).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    res.status(StatusCodes.OK).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    // Prevent deleting self
    if (req.user.id === req.params.id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'You cannot delete your own account'
      });
    }

    await deleteUserAccount(req.params.id);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete current user's account
 * @route   DELETE /api/users/me
 * @access  Private
 */
const deleteAccount = async (req, res, next) => {
  try {
    await deleteUserAccount(req.user.id);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  getUsers,
  updateRole,
  getUser,
  deleteUser,
  deleteAccount
};
