const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } = require('../config/constants');

class TokenService {
  generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  }

  getRefreshTokenExpiry() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}

module.exports = new TokenService();
