const { OTP_EXPIRY_MINUTES } = require('../config/constants');

class OTPService {
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  getOTPExpiry() {
    return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  isOTPExpired(otpExpiry) {
    return new Date() > otpExpiry;
  }
}

module.exports = new OTPService();
