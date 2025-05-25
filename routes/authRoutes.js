const { Router } = require('express');
const { StatusCodes } = require('http-status-codes');
const { protect } = require('../middlewares/authMiddleware');
const {
  signup,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  logout
} = require('../controllers/authController');

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Health check endpoint
router.get('/health', (req, res) => {
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

module.exports = router;
