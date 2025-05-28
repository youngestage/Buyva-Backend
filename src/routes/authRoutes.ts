import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { protect } from '../middlewares/authMiddleware.js';
import {
  signup,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  logout
} from '../controllers/authController.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(StatusCodes.OK).json({
    status: 'ok',
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

// Protected routes
router.use(protect);

// User profile routes
router.route('/me')
  .get(getProfile)
  .put(updateProfile)
  .delete(deleteAccount);
  
// Logout route
router.post('/logout', logout);

export default router;
