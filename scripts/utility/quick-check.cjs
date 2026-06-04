const http = require('http');

const tests = [
  { name: 'Backend Health', url: 'http://127.0.0.1:8080/api/health' },
  { name: 'Backend Info', url: 'http://127.0.0.1:8080/api/info' },
  { name: 'Frontend', url: 'http://127.0.0.1:5173/' }
];

let index = 0;
let passed = 0;
let failed = 0;

function runTest(test) {
  return new Promise((resolve) => {
    const req = http.request(test.url, { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${test.name}: ${res.statusCode}`);
        if (test.url.includes('api/health')) {
          const json = JSON.parse(data);
          console.log(`   Status: ${json.status}, Version: ${json.version}`);
        }
        passed++;
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`❌ ${test.name}: ${e.message}`);
      failed++;
      resolve();
    });
    req.setTimeout(5000, () => {
      console.log(`❌ ${test.name}: TIMEOUT`);
      req.destroy();
      failed++;
      resolve();
    });
    req.end();
  });
}

async function main() {
  console.log('=== Connectivity Tests ===\n');
  for (const test of tests) {
    await runTest(test);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
}

main().then(() => process.exit(0));