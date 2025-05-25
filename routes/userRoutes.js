const { Router } = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getCurrentUser,
  updateProfile,
  deleteAccount,
  getUsers,
  getUser,
  updateRole,
  deleteUser
} = require('../controllers/userController');

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

module.exports = router;
