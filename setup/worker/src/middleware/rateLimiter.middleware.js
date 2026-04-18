const redis = require('../config/redis');

const TOKEN_BUCKET_CAPACITY = parseInt(process.env.TOKEN_BUCKET_CAPACITY) || 300;
const REFILL_RATE = parseInt(process.env.REFILL_RATE) || 150;
const REFILL_INTERVAL = parseInt(process.env.REFILL_INTERVAL) || 60;

// Stricter limits for auth endpoints (prevent brute force)
const AUTH_BUCKET_CAPACITY = 20; // 20 requests
const AUTH_REFILL_RATE = 5; // 5 tokens per interval
const AUTH_REFILL_INTERVAL = 60; // 60 seconds

const rateLimiter = async (req, res, next) => {
  try {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/') {
      return next();
    }

    // Determine client identifier
    // For authenticated users: use user ID
    // For unauthenticated users (auth routes): use IP address
    const clientId = req.user?.id || req.ip || 'unknown';
    
    // Use stricter limits for auth endpoints
    const isAuthRoute = req.path.startsWith('/api/auth');
    const capacity = isAuthRoute ? AUTH_BUCKET_CAPACITY : TOKEN_BUCKET_CAPACITY;
    const refillRate = isAuthRoute ? AUTH_REFILL_RATE : REFILL_RATE;
    const refillInterval = isAuthRoute ? AUTH_REFILL_INTERVAL : REFILL_INTERVAL;

    const key = `rate_limit:${isAuthRoute ? 'auth' : 'api'}:${clientId}`;
    const now = Math.floor(Date.now() / 1000);

    const data = await redis.hgetall(key);
    let tokens = parseFloat(data.tokens ?? capacity);
    const lastRefill = parseInt(data.lastRefill ?? now);

    const elapsed = now - lastRefill;
    const tokensToAdd = elapsed * (refillRate / refillInterval);
    tokens = Math.min(capacity, tokens + tokensToAdd);

    if (tokens < 1) {
      res.set({
        'X-RateLimit-Limit': capacity,
        'X-RateLimit-Remaining': 0,
        'Retry-After': refillInterval
      });
      return res.status(429).json({ 
        message: 'Too many requests. Please try again later.',
        retryAfter: refillInterval
      });
    }

    tokens -= 1;
    await redis.hset(key, { tokens: tokens.toString(), lastRefill: now.toString() });
    await redis.expire(key, refillInterval * 2);

    res.set({
      'X-RateLimit-Limit': capacity,
      'X-RateLimit-Remaining': Math.floor(tokens)
    });

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Don't block requests if rate limiter fails
    next();
  }
};

module.exports = { rateLimiter };
