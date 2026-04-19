const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authorization.slice(7).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded?.userId || !decoded?.role) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireRoles(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    }

    return next();
  };
}

function canModerate(user) {
  return user.role === ROLES.ADVOCATE || user.role === ROLES.ANALYST || user.role === ROLES.ADMIN;
}

module.exports = {
  authenticateToken,
  requireRoles,
  canModerate
};
