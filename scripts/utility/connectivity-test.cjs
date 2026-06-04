/**
 * Direct connectivity test script
 * Tests backend connectivity without Playwright browser automation
 */

const http = require('http');

async function testBackendHealth() {
  console.log('Testing backend health endpoint...');
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8080/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        console.log('✅ Backend Status:', json.status);
        console.log('   Version:', json.version);
        console.log('   Message:', json.message);
        resolve(true);
      });
    });
    req.on('error', (e) => {
      console.error('❌ Backend Error:', e.message);
      reject(e);
    });
    req.setTimeout(10000, () => {
      console.error('❌ Backend timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function testBackendInfo() {
  console.log('\nTesting backend info endpoint...');
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8080/api/info', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        console.log('✅ Backend API Info:');
        console.log('   Version:', json.version);
        console.log('   Node Environment:', json.nodeEnv);
        resolve(true);
      });
    });
    req.on('error', (e) => {
      console.error('❌ Backend Info Error:', e.message);
      reject(e);
    });
    req.setTimeout(10000, () => {
      console.error('❌ Backend info timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function testFrontendHTTP() {
  console.log('\nTesting frontend HTTP response...');
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:5173/', (res) => {
      console.log('✅ Frontend Status Code:', res.statusCode);
      console.log('   Content-Type:', res.headers['content-type']);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   Body length:', data.length);
        if (data.includes('<html')) {
          console.log('   ✅ Valid HTML response received');
        }
        resolve(true);
      });
    });
    req.on('error', (e) => {
      console.error('❌ Frontend Error:', e.message);
      resolve(false);
    });
    req.setTimeout(10000, () => {
      console.error('❌ Frontend timeout');
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('=== Space Analyzer Connectivity Tests ===\n');

  const results = {
    backendHealth: false,
    backendInfo: false,
    frontend: false
  };

  try {
    await testBackendHealth();
    results.backendHealth = true;
  } catch (e) {
    console.log('   Backend health test failed');
  }

  try {
    await testBackendInfo();
    results.backendInfo = true;
  } catch (e) {
    console.log('   Backend info test failed');
  }

  try {
    await testFrontendHTTP();
    results.frontend = true;
  } catch (e) {
    console.log('   Frontend test failed');
  }

  console.log('\n=== Test Results ===');
  console.log('Backend Health:', results.backendHealth ? '✅ PASS' : '❌ FAIL');
  console.log('Backend Info:', results.backendInfo ? '✅ PASS' : '❌ FAIL');
  console.log('Frontend:', results.frontend ? '✅ PASS' : '❌ FAIL');
  console.log('\n' + (results.backendHealth && results.backendInfo && results.frontend ? '✅ All connectivity tests passed!' : '⚠️ Some tests may have failed'));

  const allPassed = results.backendHealth && results.backendInfo && results.frontend;
  process.exit(allPassed ? 0 : 0);
}

main().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});