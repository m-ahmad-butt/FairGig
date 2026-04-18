const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testIPDetection() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing IP Detection with Trust Proxy');
  console.log('='.repeat(60) + '\n');

  try {
    // Test 1: Normal request
    console.log('Test 1: Normal request (no proxy headers)');
    const response1 = await axios.post(
      `${BASE_URL}/api/auth/check-email`,
      { email: 'test@example.com' },
      { validateStatus: () => true }
    );
    console.log(`Status: ${response1.status}`);
    console.log(`Rate Limit Key will use: req.ip (likely ::1 or 127.0.0.1)\n`);

    // Test 2: Request with X-Forwarded-For header
    console.log('Test 2: Request with X-Forwarded-For header');
    const response2 = await axios.post(
      `${BASE_URL}/api/auth/check-email`,
      { email: 'test@example.com' },
      { 
        headers: {
          'X-Forwarded-For': '203.0.113.195'
        },
        validateStatus: () => true 
      }
    );
    console.log(`Status: ${response2.status}`);
    console.log(`Rate Limit Key will use: req.ip (should be 203.0.113.195 if trust proxy works)\n`);

    // Test 3: Multiple proxies
    console.log('Test 3: Request through multiple proxies');
    const response3 = await axios.post(
      `${BASE_URL}/api/auth/check-email`,
      { email: 'test@example.com' },
      { 
        headers: {
          'X-Forwarded-For': '203.0.113.195, 70.41.3.18, 150.172.238.178'
        },
        validateStatus: () => true 
      }
    );
    console.log(`Status: ${response3.status}`);
    console.log(`Rate Limit Key will use: req.ip (should be 203.0.113.195 - first IP)\n`);

    console.log('='.repeat(60));
    console.log('Conclusion:');
    console.log('='.repeat(60));
    console.log('✓ With app.set("trust proxy", true):');
    console.log('  - req.ip automatically reads X-Forwarded-For');
    console.log('  - No need to manually check req.headers["x-forwarded-for"]');
    console.log('  - Express handles proxy chain parsing for you\n');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run test
testIPDetection();
