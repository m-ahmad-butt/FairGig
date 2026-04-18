const authRepo = require('../repositories/auth.repository');
const userRepo = require('../repositories/user.repository');
const { publishMessage } = require('../config/rabbitmq');
const redis = require('../config/redis');

const delCache = async (...keys) => {
  try { if (keys.length) await redis.del(...keys); } catch { }
};

const toggleBanUser = async (req, res) => {
  try {
    const { email } = req.params;
    const { isBan } = req.body;
    
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newBanStatus = isBan !== undefined ? isBan : !user.isBan;
    await authRepo.updateUserBanStatus(email, newBanStatus);

    await delCache(`user:profile:${email}`, `user:public:${email}`, `users:all`);

    // Send email notification
    await publishMessage('email', { 
      type: 'account_status',
      email: user.email,
      name: user.name,
      isBanned: newBanStatus
    });

    await publishMessage('user.ban_status_changed', {
      email: user.email,
      name: user.name,
      isBanned: newBanStatus,
      action: newBanStatus ? 'banned' : 'unbanned',
      adminEmail: req.user?.email || 'admin'
    }, 'hackathon.topic');

    res.status(200).json({
      message: `User ${email} ${newBanStatus ? 'banned' : 'unbanned'} successfully`,
      isBanned: newBanStatus
    });
  } catch (error) {
    console.error('Toggle ban error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const promoteUser = async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await authRepo.updateUserRole(email, 'ADMIN');

    await delCache(`user:profile:${email}`, `user:public:${email}`, `users:all`);

    await publishMessage('user.promoted', {
      email,
      role: 'ADMIN',
      adminEmail: req.user.email
    }, 'hackathon.topic');

    res.status(200).json({ message: `User ${email} promoted to Admin successfully` });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let users = await authRepo.getAllUsers(0, 1000);
    
    if (search) {
      users = users.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = users.length;
    const paginatedUsers = users.slice(skip, skip + parseInt(limit));
    
    const sanitizedUsers = paginatedUsers.map(({ password, ...user }) => user);

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

const getUserStats = async (req, res) => {
  try {
    const totalUsers = await authRepo.getUserCount();
    const users = await authRepo.getAllUsers(0, totalUsers);
    
    const stats = {
      totalUsers,
      verifiedUsers: users.filter(u => u.isVerified).length,
      bannedUsers: users.filter(u => u.isBan).length,
      adminUsers: users.filter(u => u.role === 'ADMIN').length,
      studentUsers: users.filter(u => u.role === 'STUDENT').length
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { toggleBanUser, promoteUser, getAllUsers, getUserStats };