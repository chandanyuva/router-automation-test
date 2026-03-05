const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected route to get current logged-in user's profile
router.get('/me', isAuthenticated, (req, res) => {
  // Since it passed the middleware, req.user contains the decoded token payload
  res.json({ user: req.user });
});

module.exports = router;
