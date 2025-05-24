const express = require('express');
const router = express.Router();

// Import the auth controller (will be created next)
const authController = require('../controllers/authController');

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', authController.signup);

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authController.login);

module.exports = router;