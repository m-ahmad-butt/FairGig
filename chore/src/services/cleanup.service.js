const authRepo = require('../repositories/auth.repository');

class CleanupService {
  constructor() {
    this.intervalId = null;
  }

  start() {
    console.log('Starting OTP cleanup service - runs every 10 minutes');
    
    // Run immediately on start
    this.cleanupExpiredOTPs();
    
    // Then run every 10 minutes (600,000 milliseconds)
    this.intervalId = setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 10 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('OTP cleanup service stopped');
    }
  }

  async cleanupExpiredOTPs() {
    try {
      const result = await authRepo.deleteExpiredOTPs();
      if (result > 0) {
        console.log(`[Cleanup Service] Deleted ${result} expired OTPs`);
      }
    } catch (error) {
      console.error('[Cleanup Service] Error cleaning up expired OTPs:', error);
    }
  }
}

module.exports = new CleanupService();