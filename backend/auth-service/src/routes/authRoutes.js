const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateSignup,
  validateLogin,
  validateOTP,
  validateEmail,
  validateRefreshToken,
  validateWorkerProfileUpdate
} = require('../middleware/validation');

router.post('/signup', validateSignup, authController.signup);
router.post('/verify-otp', validateOTP, authController.verifyOTP);
router.post('/resend-otp', validateEmail, authController.resendOTP);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', validateRefreshToken, authController.refreshToken);
router.get('/me', authenticateToken, authController.getMe);
router.patch('/me/profile', authenticateToken, validateWorkerProfileUpdate, authController.updateWorkerProfile);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
