const bcrypt = require('bcryptjs');
const { createClerkClient } = require('@clerk/backend');
const { publishMessage } = require('../config/rabbitmq');
const authRepo = require('../repositories/auth.repository');

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await authRepo.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    await authRepo.createOTP({ email, code: otp });
    await publishMessage('email', { type: 'otp', email, otp, name: user.name });

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const register = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    const existing = await authRepo.findUserByEmail(email);
    if (existing) {
      if (existing.isVerified) return res.status(400).json({ message: 'Email already registered and verified' });
    } else {
      const hashed = await bcrypt.hash(password, 10);
      await authRepo.createUser({ email, name, password: hashed });

      try {
        await clerk.users.createUser({
          emailAddress: [email],
          password: password,
          firstName: name.split(' ')[0] || 'User',
          lastName: name.split(' ').slice(1).join(' ') || '',
          publicMetadata: { role: 'STUDENT' }
        });
      } catch (clerkErr) {
        console.error('Clerk user creation error:', clerkErr.message);
      }
    }

    const otp = generateOTP();
    await authRepo.createOTP({ email, code: otp });
    await publishMessage('email', { type: 'otp', email, otp, name });

    res.status(200).json({ message: 'Registration initiated. OTP sent to email.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    const otpRecord = await authRepo.findLatestOTP(email, code);
    if (!otpRecord) return res.status(400).json({ message: 'Invalid OTP' });

    const user = await authRepo.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await authRepo.deleteOTPs(email);
    await authRepo.verifyUser(email);

    await publishMessage('user.registered', { email: user.email, name: user.name, role: user.role || 'STUDENT' }, 'hackathon.topic');

    res.status(200).json({ message: 'Account verified successfully.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, emailAddress, password } = req.body;
    const targetEmail = email || emailAddress;

    if (!targetEmail) return res.status(400).json({ message: 'Email is required' });

    const user = await authRepo.findUserByEmail(targetEmail);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email first' });
    if (user.isBan) return res.status(403).json({ message: 'Your account has been banned' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    let clerkUser;
    try {
      const users = await clerk.users.getUserList({ emailAddress: [targetEmail] });
      clerkUser = users.data?.[0];

      if (!clerkUser) {
        clerkUser = await clerk.users.createUser({
          emailAddress: [targetEmail],
          password: password,
          firstName: user.name.split(' ')[0] || 'User',
          publicMetadata: { role: user.role || 'STUDENT' }
        });
      }
    } catch (err) {
      console.error('Clerk user error:', err.message);
      return res.status(500).json({ message: 'Authentication service error' });
    }

    try {
      const session = await clerk.sessions.createSession({ userId: clerkUser.id });
      const sessionToken = await clerk.sessions.getToken(session.id);

      if (!sessionToken?.jwt) {
        return res.status(500).json({ message: 'Token generation failed' });
      }

      const { password: _, ...safeUser } = user;

      res.status(200).json({
        message: 'Login successful',
        token: sessionToken.jwt,
        user: { ...safeUser, imageUrl: safeUser.imageUrl || null }
      });
    } catch (sessionErr) {
      console.error('Session creation error:', sessionErr);
      return res.status(500).json({ message: 'Failed to create session' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await authRepo.findUserByEmail(email);
    res.status(200).json({ exists: !!user });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const user = await authRepo.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashed = await bcrypt.hash(password, 10);
    await authRepo.updatePassword(email, hashed);

    try {
      const users = await clerk.users.getUserList({ emailAddress: [email] });
      const clerkUser = users.data?.[0];
      if (clerkUser) {
        await clerk.users.updateUser(clerkUser.id, { password: password });
      }
    } catch (err) {
      console.error('Clerk password sync error:', err.message);
    }

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const promote = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    await authRepo.updateUserRole(email, 'ADMIN');

    const users = await clerk.users.getUserList({ emailAddress: [email] });
    const clerkUser = users.data?.[0];

    if (!clerkUser) return res.status(404).json({ message: 'User not found in Clerk' });

    await clerk.users.updateUser(clerkUser.id, { publicMetadata: { role: 'ADMIN' } });
    await publishMessage('user.promoted', { email, role: 'ADMIN' }, 'hackathon.topic');

    res.status(200).json({ message: `User ${email} promoted to Admin successfully` });
  } catch (error) {
    console.error('Promote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getToken = async (req, res) => {
  try {
    const { email, emailAddress, password } = req.body;
    const targetEmail = email || emailAddress;

    if (!targetEmail) return res.status(400).json({ message: 'Email is required' });

    const user = await authRepo.findUserByEmail(targetEmail);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email first' });
    if (user.isBan) return res.status(403).json({ message: 'Your account has been banned' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    let clerkUser;
    try {
      const users = await clerk.users.getUserList({ emailAddress: [targetEmail] });
      clerkUser = users.data?.[0];

      if (!clerkUser) {
        clerkUser = await clerk.users.createUser({
          emailAddress: [targetEmail],
          password: password,
          firstName: user.name.split(' ')[0] || 'User',
          publicMetadata: { role: 'STUDENT' }
        });
      }
    } catch (err) {
      return res.status(500).json({ message: 'Authentication service error' });
    }

    const session = await clerk.sessions.createSession({ userId: clerkUser.id });
    const sessionToken = await clerk.sessions.getToken(session.id);

    if (!sessionToken?.jwt) {
      return res.status(500).json({ message: 'Token generation failed' });
    }

    res.status(200).json({ token: sessionToken.jwt });
  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleBan = async (req, res) => {
  try {
    const { email, isBan } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await authRepo.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newBanStatus = isBan !== undefined ? isBan : !user.isBan;
    await authRepo.updateUserBanStatus(email, newBanStatus);

    await publishMessage('email', { 
      type: 'account_status',
      email, 
      name: user.name,
      isBanned: newBanStatus,
      action: newBanStatus ? 'banned' : 'unbanned'
    });

    res.status(200).json({ message: `User ${email} ${newBanStatus ? 'banned' : 'unbanned'} successfully`, isBan: newBanStatus });
  } catch (error) {
    console.error('Toggle ban error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await authRepo.getAllUsers(skip, parseInt(limit));
    const total = await authRepo.getUserCount();

    const sanitizedUsers = users.map(({ password, ...user }) => user);

    res.status(200).json({
      users: sanitizedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, verifyOTP, sendOTP, login, checkEmail, changePassword, promote, getToken, toggleBan, getAllUsers };
