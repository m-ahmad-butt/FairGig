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

  async approveUserByToken(req, res) {
    try {
      const { token } = req.params;

      // Decode the token (userId is base64 encoded)
      const userId = Buffer.from(token, 'base64').toString('utf-8');

      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>User Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc3545; }
            </style>
          </head>
          <body>
            <h1 class="error">User Not Found</h1>
            <p>The user you're trying to approve doesn't exist.</p>
          </body>
          </html>
        `);
      }

      if (user.status === USER_STATUS.ACTIVE) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Already Approved</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: #28a745; }
            </style>
          </head>
          <body>
            <h1 class="success">Already Approved</h1>
            <p>${user.name} has already been approved.</p>
          </body>
          </html>
        `);
      }

      await userRepository.update(userId, { status: USER_STATUS.ACTIVE });

      await emailService.sendAccountApprovedEmail(user.email, user.name, user.role);

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Approved</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
            .info { color: #6c757d; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ User Approved Successfully!</h1>
          <p><strong>${user.name}</strong> (${user.email}) has been approved.</p>
          <p class="info">Role: ${user.role}</p>
          <p class="info">An approval email has been sent to the user.</p>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Approve user by token error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <h1 class="error">Error</h1>
          <p>Something went wrong. Please try again later.</p>
        </body>
        </html>
      `);
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
