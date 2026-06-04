const http = require('http');

console.log('=== Space Analyzer Connectivity Summary ===\n');

let passed = 0;
let failed = 0;

function test(name, url) {
  return new Promise((resolve) => {
    const start = Date.now();
    http.get(url, (res) => {
      const elapsed = Date.now() - start;
      console.log(`✅ ${name}: ${res.statusCode} (${elapsed}ms)`);
      passed++;
      resolve(true);
    }).on('error', (e) => {
      console.log(`❌ ${name}: DOWN - ${e.message}`);
      failed++;
      resolve(false);
    }).setTimeout(5000, () => {
      console.log(`❌ ${name}: TIMEOUT`);
      failed++;
      resolve(false);
    });
  });
}

async function main() {
  await test('Backend (8080)', 'http://127.0.0.1:8080/api/health');
  await test('Frontend (5173)', 'http://127.0.0.1:5173/');
  await test('API Info', 'http://127.0.0.1:8080/api/info');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(0);
}

main();