const { ROLES } = require('../config/constants');

const WORKER_CATEGORIES = ['rider', 'freelance'];
const RIDER_PLATFORMS = ['uber', 'careem'];
const FREELANCER_PLATFORMS = ['fiverr', 'upwork'];
const ALL_WORKER_PLATFORMS = [...RIDER_PLATFORMS, ...FREELANCER_PLATFORMS];
const RIDER_VEHICLE_TYPES = ['bike', 'car', 'rickshaw'];
const FREELANCER_TYPES = ['ui_ux', 'web_development', 'graphic_design', 'content_writing', 'digital_marketing'];

function isProvided(value) {
  return value !== undefined && value !== null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumberValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed);
  }

  return false;
}

function validateWorkerSelectionFields({ category, platform, vehicleType, freelancerType }, { requireCompleteSelection = false } = {}) {
  if (isProvided(category) && !WORKER_CATEGORIES.includes(category)) {
    return 'category must be either rider or freelance';
  }

  if (isProvided(platform) && !ALL_WORKER_PLATFORMS.includes(platform)) {
    return 'platform must be one of uber, careem, fiverr, upwork';
  }

  if (isProvided(vehicleType) && !RIDER_VEHICLE_TYPES.includes(vehicleType)) {
    return 'vehicleType must be one of bike, car, rickshaw';
  }

  if (isProvided(freelancerType) && !FREELANCER_TYPES.includes(freelancerType)) {
    return 'freelancerType must be one of ui_ux, web_development, graphic_design, content_writing, digital_marketing';
  }

  if (isProvided(vehicleType) && isProvided(freelancerType)) {
    return 'Provide either vehicleType or freelancerType, not both';
  }

  if (category === 'rider') {
    if (requireCompleteSelection && !isProvided(vehicleType)) {
      return 'vehicleType is required for rider category';
    }

    if (isProvided(platform) && !RIDER_PLATFORMS.includes(platform)) {
      return 'For rider category, platform must be uber or careem';
    }

    if (isProvided(freelancerType)) {
      return 'freelancerType is only valid for freelance category';
    }
  }

  if (category === 'freelance') {
    if (requireCompleteSelection && !isProvided(freelancerType)) {
      return 'freelancerType is required for freelance category';
    }

    if (isProvided(platform) && !FREELANCER_PLATFORMS.includes(platform)) {
      return 'For freelance category, platform must be fiverr or upwork';
    }

    if (isProvided(vehicleType)) {
      return 'vehicleType is only valid for rider category';
    }
  }

  return null;
}

function validateSignup(req, res, next) {
  const { name, email, password, role, category, platform, vehicleType, freelancerType } = req.body;

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

  if (role === ROLES.WORKER) {
    if (!category || !platform) {
      return res.status(400).json({ error: 'category and platform are required for workers' });
    }

    const workerSelectionError = validateWorkerSelectionFields(
      { category, platform, vehicleType, freelancerType },
      { requireCompleteSelection: true }
    );

    if (workerSelectionError) {
      return res.status(400).json({ error: workerSelectionError });
    }
  } else if (isProvided(category) || isProvided(platform) || isProvided(vehicleType) || isProvided(freelancerType)) {
    return res.status(400).json({ error: 'category, platform, vehicleType and freelancerType are only allowed for workers' });
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
  const allowedKeys = ['zone', 'city', 'category', 'platform', 'vehicleType', 'freelancerType', 'latitude', 'longitude'];
  const payloadKeys = Object.keys(req.body || {});

  if (payloadKeys.length === 0) {
    return res.status(400).json({ error: 'At least one field is required for update' });
  }

  const invalidKeys = payloadKeys.filter((key) => !allowedKeys.includes(key));
  if (invalidKeys.length > 0) {
    return res.status(400).json({ error: `Invalid fields: ${invalidKeys.join(', ')}` });
  }

  const { zone, city, category, platform, vehicleType, freelancerType, latitude, longitude } = req.body;

  if (zone !== undefined && zone !== null && (typeof zone !== 'string' || zone.trim().length === 0)) {
    return res.status(400).json({ error: 'zone must be a non-empty string or null' });
  }

  if (city !== undefined && city !== null && (typeof city !== 'string' || city.trim().length === 0)) {
    return res.status(400).json({ error: 'city must be a non-empty string or null' });
  }

  if (latitude !== undefined && latitude !== null) {
    if (!isFiniteNumberValue(latitude)) {
      return res.status(400).json({ error: 'latitude must be a valid number between -90 and 90 or null' });
    }

    const latitudeNumber = Number(latitude);
    if (latitudeNumber < -90 || latitudeNumber > 90) {
      return res.status(400).json({ error: 'latitude must be between -90 and 90' });
    }
  }

  if (longitude !== undefined && longitude !== null) {
    if (!isFiniteNumberValue(longitude)) {
      return res.status(400).json({ error: 'longitude must be a valid number between -180 and 180 or null' });
    }

    const longitudeNumber = Number(longitude);
    if (longitudeNumber < -180 || longitudeNumber > 180) {
      return res.status(400).json({ error: 'longitude must be between -180 and 180' });
    }
  }

  const workerSelectionError = validateWorkerSelectionFields({
    category,
    platform,
    vehicleType,
    freelancerType
  });

  if (workerSelectionError) {
    return res.status(400).json({ error: workerSelectionError });
  }

  next();
}

function validateProfileUpdate(req, res, next) {
  const allowedKeys = [
    'name',
    'currentPassword',
    'newPassword',
    'zone',
    'city',
    'category',
    'platform',
    'vehicleType',
    'freelancerType',
    'latitude',
    'longitude'
  ];

  const payloadKeys = Object.keys(req.body || {});

  if (payloadKeys.length === 0) {
    return res.status(400).json({ error: 'At least one field is required for update' });
  }

  const invalidKeys = payloadKeys.filter((key) => !allowedKeys.includes(key));
  if (invalidKeys.length > 0) {
    return res.status(400).json({ error: `Invalid fields: ${invalidKeys.join(', ')}` });
  }

  const {
    name,
    currentPassword,
    newPassword,
    zone,
    city,
    category,
    platform,
    vehicleType,
    freelancerType,
    latitude,
    longitude
  } = req.body;

  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  if (newPassword !== undefined) {
    if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
      return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
    }

    if (!isNonEmptyString(currentPassword)) {
      return res.status(400).json({ error: 'currentPassword is required when changing password' });
    }
  }

  if (currentPassword !== undefined && newPassword === undefined) {
    return res.status(400).json({ error: 'newPassword is required when currentPassword is provided' });
  }

  if (zone !== undefined && zone !== null && !isNonEmptyString(zone)) {
    return res.status(400).json({ error: 'zone must be a non-empty string or null' });
  }

  if (city !== undefined && city !== null && !isNonEmptyString(city)) {
    return res.status(400).json({ error: 'city must be a non-empty string or null' });
  }

  if (latitude !== undefined && latitude !== null) {
    if (!isFiniteNumberValue(latitude)) {
      return res.status(400).json({ error: 'latitude must be a valid number between -90 and 90 or null' });
    }

    const latitudeNumber = Number(latitude);
    if (latitudeNumber < -90 || latitudeNumber > 90) {
      return res.status(400).json({ error: 'latitude must be between -90 and 90' });
    }
  }

  if (longitude !== undefined && longitude !== null) {
    if (!isFiniteNumberValue(longitude)) {
      return res.status(400).json({ error: 'longitude must be a valid number between -180 and 180 or null' });
    }

    const longitudeNumber = Number(longitude);
    if (longitudeNumber < -180 || longitudeNumber > 180) {
      return res.status(400).json({ error: 'longitude must be between -180 and 180' });
    }
  }

  const workerSelectionError = validateWorkerSelectionFields({
    category,
    platform,
    vehicleType,
    freelancerType
  });

  if (workerSelectionError) {
    return res.status(400).json({ error: workerSelectionError });
  }

  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateOTP,
  validateEmail,
  validateRefreshToken,
  validateProfileUpdate,
  validateWorkerProfileUpdate
};
