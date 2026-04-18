const { ROLES } = require('../config/constants');

function validateSignup(req, res, next) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  next();
}

function validateOTP(req, res, next) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  next();
}

function validateEmail(req, res, next) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  next();
}

function validateRefreshToken(req, res, next) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  next();
}

function validateWorkerProfileUpdate(req, res, next) {
  const allowedKeys = ['zone', 'city', 'category', 'vehicleType'];
  const payloadKeys = Object.keys(req.body || {});

  if (payloadKeys.length === 0) {
    return res.status(400).json({ error: 'At least one field is required for update' });
  }

  const invalidKeys = payloadKeys.filter((key) => !allowedKeys.includes(key));
  if (invalidKeys.length > 0) {
    return res.status(400).json({ error: `Invalid fields: ${invalidKeys.join(', ')}` });
  }

  const { zone, city, category, vehicleType } = req.body;

  if (zone !== undefined && zone !== null && (typeof zone !== 'string' || zone.trim().length === 0)) {
    return res.status(400).json({ error: 'zone must be a non-empty string or null' });
  }

  if (city !== undefined && city !== null && (typeof city !== 'string' || city.trim().length === 0)) {
    return res.status(400).json({ error: 'city must be a non-empty string or null' });
  }

  if (category !== undefined && category !== null) {
    const allowedCategories = ['rider', 'freelance'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'category must be either rider or freelance' });
    }
  }

  if (vehicleType !== undefined && vehicleType !== null) {
    const allowedVehicleTypes = ['bike', 'car', 'rickshaw'];
    if (!allowedVehicleTypes.includes(vehicleType)) {
      return res.status(400).json({ error: 'vehicleType must be one of bike, car, rickshaw' });
    }
  }

  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateOTP,
  validateEmail,
  validateRefreshToken,
  validateWorkerProfileUpdate
};
