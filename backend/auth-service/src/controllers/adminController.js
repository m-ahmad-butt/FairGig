const userRepository = require('../repositories/userRepository');
const emailService = require('../utils/emailService');
const { USER_STATUS } = require('../config/constants');

function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value);
}

class AdminController {
  async getPendingUsers(req, res) {
    try {
      const pendingUsers = await userRepository.findPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async approveUser(req, res) {
    try {
      const { userId } = req.params;

      if (!isObjectId(userId)) {
        return res.status(400).json({ error: 'userId must be a valid Mongo ObjectId string' });
      }

      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.status === USER_STATUS.ACTIVE) {
        return res.status(400).json({ error: 'User already approved' });
      }

      await userRepository.update(userId, { status: USER_STATUS.ACTIVE });

      await emailService.sendAccountApprovedEmail(user.email, user.name, user.role);

      res.json({ message: 'User approved successfully' });
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async approveUserByToken(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Approval token is required' });
      }

      const userId = Buffer.from(token, 'base64').toString('utf-8');

      if (!isObjectId(userId)) {
        return res.status(400).json({ error: 'Invalid approval token' });
      }

      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.status === USER_STATUS.ACTIVE) {
        return res.status(200).json({
          message: 'User already approved',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
          }
        });
      }

      await userRepository.update(userId, { status: USER_STATUS.ACTIVE });

      await emailService.sendAccountApprovedEmail(user.email, user.name, user.role);

      return res.status(200).json({
        message: 'User approved successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: USER_STATUS.ACTIVE
        }
      });
    } catch (error) {
      console.error('Approve user by token error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async rejectUser(req, res) {
    try {
      const { userId } = req.params;

      if (!isObjectId(userId)) {
        return res.status(400).json({ error: 'userId must be a valid Mongo ObjectId string' });
      }

      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await userRepository.update(userId, { status: USER_STATUS.REJECTED });

      await emailService.sendAccountRejectedEmail(user.email, user.name);

      res.json({ message: 'User rejected successfully' });
    } catch (error) {
      console.error('Reject user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AdminController();
