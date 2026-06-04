const http = require('http');

function test(name, options) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(options, (res) => {
      const ms = Date.now() - start;
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${ms}ms] ${name}: ${res.statusCode} OK`);
        resolve(true);
      });
    });
    req.on('error', (e) => {
      console.log(`[ERR] ${name}: ${e.message}`);
      resolve(false);
    });
    req.setTimeout(5000, () => {
      console.log(`[TMO] ${name}: timeout`);
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  const results = [];

  // Test all services
  results.push(await test('Backend (127.0.0.1:8080)', {
    hostname: '127.0.0.1', port: 8080, path: '/api/health', method: 'GET'
  }));

  results.push(await test('Frontend (127.0.0.1:5173)', {
    hostname: '127.0.0.1', port: 5173, path: '/', method: 'GET'
  }));

  // Try localhost as well
  results.push(await test('Backend (localhost:8080)', {
    hostname: 'localhost', port: 8080, path: '/api/health', method: 'GET'
  }));

  results.push(await test('Frontend (localhost:5173)', {
    hostname: 'localhost', port: 5173, path: '/', method: 'GET'
  }));

  // Try 0.0.0.0
  results.push(await test('Frontend (0.0.0.0:5173)', {
    hostname: '0.0.0.0', port: 5173, path: '/', method: 'GET'
  }));

  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  process.exit(0);
}

main();