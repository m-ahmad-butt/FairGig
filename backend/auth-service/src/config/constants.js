module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  JWT_EXPIRES_IN: '1h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  OTP_EXPIRY_MINUTES: 10,
  ADMIN_EMAIL: 'l233059@lhr.nu.edu.pk',
  ROLES: {
    WORKER: 'worker',
    VERIFIER: 'verifier',
    ADVOCATE: 'advocate'
  },
  USER_STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    REJECTED: 'rejected'
  }
};
