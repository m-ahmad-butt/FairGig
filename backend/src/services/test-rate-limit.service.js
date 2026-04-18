const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  gray: (msg) => console.log(`${colors.gray}${msg}${colors.reset}`)
};

async function testRateLimiting() {
  console.log('\n' + '='.repeat(60));
  log.info('Testing Rate Limiting on /api/auth/check-email');
  console.log('='.repeat(60) + '\n');

  log.info(`Target: ${BASE_URL}/api/auth/check-email`);
  log.info(`Rate Limit: 20 requests per minute (for auth routes)`);
  log.info(`Test: Sending 25 requests rapidly\n`);

  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;

  const startTime = Date.now();

  for (let i = 1; i <= 25; i++) {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/check-email`,
        { email: TEST_EMAIL },
        { 
          validateStatus: () => true, // Don't throw on any status
          timeout: 5000 
        }
      );

      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];

      if (response.status === 200 || response.status === 400) {
        successCount++;
        log.success(
          `Request ${i.toString().padStart(2)}: ${response.status} | ` +
          `Remaining: ${remaining}/${limit}`
        );
      } else if (response.status === 429) {
        rateLimitedCount++;
        const retryAfter = response.headers['retry-after'];
        log.error(
          `Request ${i.toString().padStart(2)}: 429 TOO MANY REQUESTS | ` +
          `Retry after: ${retryAfter}s`
        );
      } else {
        errorCount++;
        log.warning(`Request ${i.toString().padStart(2)}: ${response.status}`);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      errorCount++;
      log.error(`Request ${i.toString().padStart(2)}: ${error.message}`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  log.info('Test Results');
  console.log('='.repeat(60) + '\n');

  console.log(`Total Requests:     ${25}`);
  console.log(`${colors.green}Successful:         ${successCount}${colors.reset}`);
  console.log(`${colors.red}Rate Limited (429): ${rateLimitedCount}${colors.reset}`);
  console.log(`${colors.yellow}Errors:             ${errorCount}${colors.reset}`);
  console.log(`Duration:           ${duration}s\n`);

  if (rateLimitedCount > 0) {
    log.success('✓ Rate limiting is WORKING correctly!');
    log.info(`After ${successCount} requests, the server started blocking with 429 status.`);
  } else {
    log.warning('⚠ Rate limiting might NOT be working!');
    log.warning('All requests succeeded without hitting the limit.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function testAuthenticatedRateLimiting() {
  console.log('\n' + '='.repeat(60));
  log.info('Testing Rate Limiting on Authenticated Routes');
  console.log('='.repeat(60) + '\n');

  log.warning('Note: This requires a valid authentication token');
  log.info('Skipping authenticated route test (requires manual token)\n');
  
  log.gray('To test authenticated routes:');
  log.gray('1. Get a valid token from login');
  log.gray('2. Add it to the script');
  log.gray('3. Test /api/users or other protected endpoints\n');
}

// Main execution
(async () => {
  try {
    // Test unauthenticated route (auth endpoints)
    await testRateLimiting();
    
    // Info about authenticated routes
    await testAuthenticatedRateLimiting();

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
})();
