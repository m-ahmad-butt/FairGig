const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const emailService = require('../utils/emailService');
const tokenService = require('../utils/tokenService');
const otpService = require('../utils/otpService');
const { ROLES, USER_STATUS, ADMIN_EMAIL } = require('../config/constants');
const {
  PLATFORM_OPTIONS,
  RIDER_PLATFORMS,
  FREELANCER_PLATFORMS,
  isWorkerCategory
} = require('../config/platformOptions');

class AuthController {
  constructor() {
    this.signup = this.signup.bind(this);
    this.verifyOTP = this.verifyOTP.bind(this);
    this.resendOTP = this.resendOTP.bind(this);
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.getMe = this.getMe.bind(this);
    this.getPlatforms = this.getPlatforms.bind(this);
    this.updateWorkerProfile = this.updateWorkerProfile.bind(this);
    this.getOnPlatformWorkers = this.getOnPlatformWorkers.bind(this);
    this.logout = this.logout.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
  }

  isObjectId(id) {
    return /^[a-f\d]{24}$/i.test(id);
  }

  normalizeOptionalString(value) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return typeof value === 'string' ? value.trim() : null;
  }

  normalizeOptionalNumber(value) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  applyWorkerTypeAndPlatformUpdates(user, payload, updateData, categoryOverride) {
    const effectiveCategory = categoryOverride || user.category;

    if (!effectiveCategory) {
      return 'Worker category is missing. Please contact support to initialize your category.';
    }

    if (payload.platform !== undefined) {
      if (payload.platform === null) {
        return 'platform cannot be null';
      }

      const allowedPlatforms = effectiveCategory === 'rider' ? RIDER_PLATFORMS : FREELANCER_PLATFORMS;
      if (!allowedPlatforms.includes(payload.platform)) {
        return effectiveCategory === 'rider'
          ? `For rider category, platform must be one of ${RIDER_PLATFORMS.join(', ')}`
          : `For freelance category, platform must be one of ${FREELANCER_PLATFORMS.join(', ')}`;
      }

      updateData.platform = payload.platform;
    }

    if (effectiveCategory === 'rider') {
      if (payload.freelancerType !== undefined) {
        return 'freelancerType can only be updated for freelance workers';
      }

      if (payload.vehicleType !== undefined) {
        if (payload.vehicleType === null) {
          return 'vehicleType cannot be null for rider workers';
        }

        updateData.vehicleType = payload.vehicleType;
        updateData.freelancerType = null;
      }
    } else if (effectiveCategory === 'freelance') {
      if (payload.vehicleType !== undefined) {
        return 'vehicleType can only be updated for rider workers';
      }

      if (payload.freelancerType !== undefined) {
        if (payload.freelancerType === null) {
          return 'freelancerType cannot be null for freelance workers';
        }

        updateData.freelancerType = payload.freelancerType;
        updateData.vehicleType = null;
      }
    } else {
      return 'Unsupported worker category';
    }

    return null;
  }

  async signup(req, res) {
    try {
      const { name, email, password, role, category, platform, vehicleType, freelancerType } = req.body;

      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = otpService.generateOTP();
      const otpExpiry = otpService.getOTPExpiry();

      const user = await userRepository.create({
        name,
        email,
        password: hashedPassword,
        role,
        status: USER_STATUS.PENDING,
        emailVerified: false,
        zone: null,
        city: null,
        category: role === ROLES.WORKER ? (category ?? null) : null,
        platform: role === ROLES.WORKER ? (platform ?? null) : null,
        vehicleType: role === ROLES.WORKER && category === 'rider' ? (vehicleType ?? null) : null,
        freelancerType: role === ROLES.WORKER && category === 'freelance' ? (freelancerType ?? null) : null,
        latitude: null,
        longitude: null,
        otp,
        otpExpiry
      });

      await emailService.sendOTPEmail(email, name, otp);

      res.status(201).json({
        message: 'User registered successfully. Please verify your email with the OTP sent.',
        userId: user.id,
        role: user.role
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      const user = await userRepository.findByEmail(email);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      if (!user.otp || !user.otpExpiry) {
        return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
      }

      if (otpService.isOTPExpired(user.otpExpiry)) {
        return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
      }

      if (user.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      const updateData = {
        emailVerified: true,
        otp: null,
        otpExpiry: null,
        status: user.role === ROLES.WORKER ? USER_STATUS.ACTIVE : USER_STATUS.PENDING
      };

      await userRepository.updateByEmail(email, updateData);

      if (user.role === ROLES.WORKER) {
        await emailService.sendAccountActivatedEmail(email, user.name);

        return res.json({
          message: 'Email verified successfully. Your account is now active.',
          status: USER_STATUS.ACTIVE
        });
      } else {
        await emailService.sendAdminApprovalNotification(ADMIN_EMAIL, user);

        return res.json({
          message: 'Email verified successfully. Your account is pending admin approval.',
          status: USER_STATUS.PENDING
        });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resendOTP(req, res) {
    try {
      const { email } = req.body;

      const user = await userRepository.findByEmail(email);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      const otp = otpService.generateOTP();
      const otpExpiry = otpService.getOTPExpiry();

      await userRepository.updateByEmail(email, { otp, otpExpiry });

      await emailService.sendOTPEmail(email, user.name, otp);

      res.json({ message: 'New OTP sent successfully' });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await userRepository.findByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ error: 'Please verify your email first' });
      }

      if (user.status !== USER_STATUS.ACTIVE) {
        return res.status(403).json({ error: 'Your account is pending admin approval' });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = tokenService.generateRefreshToken({ userId: user.id });

      // Delete old refresh tokens for this user before creating a new one
      await refreshTokenRepository.deleteByUserId(user.id);

      await refreshTokenRepository.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: tokenService.getRefreshTokenExpiry()
      });

      res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          zone: user.zone,
          city: user.city,
          category: user.category,
          platform: user.platform,
          vehicleType: user.vehicleType,
          freelancerType: user.freelancerType,
          latitude: user.latitude,
          longitude: user.longitude
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      const storedToken = await refreshTokenRepository.findByToken(refreshToken);

      if (!storedToken || new Date() > storedToken.expiresAt) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }

      const decoded = tokenService.verifyRefreshToken(refreshToken);

      const user = await userRepository.findById(decoded.userId);

      if (!user || user.status !== USER_STATUS.ACTIVE) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }

      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.json({ accessToken });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMe(req, res) {
    try {
      const user = await userRepository.getUserProfile(req.user.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPlatforms(req, res) {
    try {
      const { category } = req.query;

      if (category !== undefined) {
        if (!isWorkerCategory(category)) {
          return res.status(400).json({ error: 'category must be either rider or freelance' });
        }

        return res.json({
          category,
          platforms: PLATFORM_OPTIONS[category]
        });
      }

      return res.json({
        categories: Object.keys(PLATFORM_OPTIONS),
        platforms: PLATFORM_OPTIONS
      });
    } catch (error) {
      console.error('Get platforms error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateWorkerProfile(req, res) {
    try {
      if (req.user.role !== ROLES.WORKER) {
        return res.status(403).json({ error: 'Only workers can update this profile section' });
      }

      const user = await userRepository.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { zone, city, category, platform, vehicleType, freelancerType, latitude, longitude } = req.body;

      let nextCategory = user.category;
      if (category !== undefined) {
        if (user.category && category !== user.category) {
          return res.status(400).json({ error: 'category cannot be changed once selected' });
        }

        if (!user.category) {
          nextCategory = category;
        }
      }

      const updateData = {};

      if (zone !== undefined) {
        updateData.zone = this.normalizeOptionalString(zone);
      }

      if (city !== undefined) {
        updateData.city = this.normalizeOptionalString(city);
      }

      if (latitude !== undefined) {
        updateData.latitude = this.normalizeOptionalNumber(latitude);
      }

      if (longitude !== undefined) {
        updateData.longitude = this.normalizeOptionalNumber(longitude);
      }

      if (!user.category && nextCategory) {
        updateData.category = nextCategory;
      }

      const hasWorkerTypeUpdate =
        category !== undefined ||
        platform !== undefined ||
        vehicleType !== undefined ||
        freelancerType !== undefined;

      if (hasWorkerTypeUpdate) {
        const workerUpdateError = this.applyWorkerTypeAndPlatformUpdates(
          user,
          { platform, vehicleType, freelancerType },
          updateData,
          nextCategory
        );

        if (workerUpdateError) {
          return res.status(400).json({ error: workerUpdateError });
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No changes to update' });
      }

      await userRepository.update(req.user.userId, updateData);
      const updatedUser = await userRepository.getUserProfile(req.user.userId);

      return res.json({
        message: 'Worker profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update worker profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOnPlatformWorkers(req, res) {
    try {
      const { worker_id, id } = req.query;
      const lookupWorkerId = worker_id || id;

      if (lookupWorkerId) {
        if (!this.isObjectId(lookupWorkerId)) {
          return res.status(400).json({ error: 'worker_id or id must be a valid Mongo ObjectId string' });
        }

        const worker = await userRepository.findOnPlatformWorkerById(lookupWorkerId);
        if (!worker) {
          return res.status(404).json({ error: 'Worker not found on platform' });
        }

        return res.json({ worker });
      }

      const workers = await userRepository.findOnPlatformWorkers();
      return res.json({
        count: workers.length,
        workers
      });
    } catch (error) {
      console.error('Get on-platform workers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await refreshTokenRepository.deleteByToken(refreshToken);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req, res) {
    try {
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
      const userId = req.user.userId;

      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updateData = {};
      const isWorker = req.user.role === ROLES.WORKER;

      if (name && name.trim() !== user.name) {
        updateData.name = name.trim();
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required' });
        }

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      let nextCategory = user.category;
      if (category !== undefined) {
        if (!isWorker) {
          if (category !== null) {
            return res.status(403).json({ error: 'Only workers can set category' });
          }

          updateData.category = null;
        } else {
          if (user.category && category !== user.category) {
            return res.status(400).json({ error: 'category cannot be changed once selected' });
          }

          if (!user.category) {
            nextCategory = category;
            updateData.category = category;
          }
        }
      }

      const workerProfileFieldsProvided =
        zone !== undefined ||
        city !== undefined ||
        platform !== undefined ||
        vehicleType !== undefined ||
        freelancerType !== undefined ||
        latitude !== undefined ||
        longitude !== undefined;

      if (isWorker) {
        if (zone !== undefined) {
          updateData.zone = this.normalizeOptionalString(zone);
        }

        if (city !== undefined) {
          updateData.city = this.normalizeOptionalString(city);
        }

        if (latitude !== undefined) {
          updateData.latitude = this.normalizeOptionalNumber(latitude);
        }

        if (longitude !== undefined) {
          updateData.longitude = this.normalizeOptionalNumber(longitude);
        }

        const hasWorkerTypeUpdate =
          category !== undefined ||
          platform !== undefined ||
          vehicleType !== undefined ||
          freelancerType !== undefined;

        if (hasWorkerTypeUpdate) {
          const workerUpdateError = this.applyWorkerTypeAndPlatformUpdates(
            user,
            { platform, vehicleType, freelancerType },
            updateData,
            nextCategory
          );

          if (workerUpdateError) {
            return res.status(400).json({ error: workerUpdateError });
          }
        }
      } else if (workerProfileFieldsProvided) {
        const hasNonWorkerNonNullValue = [
          zone,
          city,
          platform,
          vehicleType,
          freelancerType,
          latitude,
          longitude
        ].some((value) => value !== undefined && value !== null);

        if (hasNonWorkerNonNullValue) {
          return res.status(403).json({
            error: 'Only workers can update non-null location, platform and worker type fields'
          });
        }

        if (zone !== undefined) {
          updateData.zone = null;
        }

        if (city !== undefined) {
          updateData.city = null;
        }

        if (platform !== undefined) {
          updateData.platform = null;
        }

        if (vehicleType !== undefined) {
          updateData.vehicleType = null;
        }

        if (freelancerType !== undefined) {
          updateData.freelancerType = null;
        }

        if (latitude !== undefined) {
          updateData.latitude = null;
        }

        if (longitude !== undefined) {
          updateData.longitude = null;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No changes to update' });
      }

      await userRepository.update(userId, updateData);

      const updatedUser = await userRepository.getUserProfile(userId);

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();
