import { Router } from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  getCurrentUser,
  updateProfile,
  deleteAccount,
  getUsers,
  getUser,
  updateRole,
  deleteUser
} from '../controllers/userController.js';

const router = Router();

// Protect all routes with authentication
router.use(protect);

// Routes for the currently authenticated user
router.route('/me')
  .get(getCurrentUser)
  .patch(updateProfile)
  .delete(deleteAccount);

// Admin-only routes
router.use(authorize('admin'));

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUser)
  .delete(deleteUser);

router.route('/:id/role')
  .patch(updateRole);

export default router;
