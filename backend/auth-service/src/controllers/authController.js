const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const emailService = require('../utils/emailService');
const tokenService = require('../utils/tokenService');
const otpService = require('../utils/otpService');
const { ROLES, USER_STATUS, ADMIN_EMAIL } = require('../config/constants');

class AuthController {
  async signup(req, res) {
    try {
      const { name, email, password, role } = req.body;

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
        category: null,
        vehicleType: null,
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
          vehicleType: user.vehicleType
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

  async updateWorkerProfile(req, res) {
    try {
      if (req.user.role !== ROLES.WORKER) {
        return res.status(403).json({ error: 'Only workers can update this profile section' });
      }

      const { zone, city, category, vehicleType } = req.body;
      const updateData = {};

      if (zone !== undefined) {
        updateData.zone = typeof zone === 'string' ? zone.trim() : null;
      }

      if (city !== undefined) {
        updateData.city = typeof city === 'string' ? city.trim() : null;
      }

      if (category !== undefined) {
        updateData.category = category;
      }

      if (vehicleType !== undefined) {
        updateData.vehicleType = vehicleType;
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
      const { name, currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updateData = {};

      if (name && name !== user.name) {
        updateData.name = name;
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
