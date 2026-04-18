const userRepository = require('../repositories/userRepository');
const emailService = require('../utils/emailService');
const { USER_STATUS } = require('../config/constants');

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

  async rejectUser(req, res) {
    try {
      const { userId } = req.params;

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
