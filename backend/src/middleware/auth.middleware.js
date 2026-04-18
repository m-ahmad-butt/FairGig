const { createClerkClient, verifyToken } = require('@clerk/backend');

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const clerkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        clockSkewInMs: 7200000,
      });
      
      if (!payload || !payload.sub) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      let email = payload?.email ||
        payload?.primary_email_address ||
        payload?.xmAG_ir?.primary_email_address || '';

      let metadata = payload?.metadata || payload?.xmAG_ir || {};

      if (!email && payload.sub) {
        try {
          const clerkUser = await clerk.users.getUser(payload.sub);
          email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
          metadata = { ...metadata, ...clerkUser.publicMetadata };
        } catch (err) {
          console.error('Failed to fetch user details:', err.message);
        }
      }

      const userRole = metadata.role || 'STUDENT';
      if (!email) {
        return res.status(401).json({ message: 'User email not found' });
      }

      req.user = {
        id: payload.sub,
        email: email,
        role: userRole,
        metadata: metadata
      };

      req.headers['x-user-email'] = email;
      req.headers['x-user-role'] = userRole;
      next();
    } catch (verifyError) {
      console.error('Token verification error:', verifyError.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { clerkAuth, requireAdmin };
