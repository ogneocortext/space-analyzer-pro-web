const http = require('http');
const net = require('net');

console.log('=== Vite Port Test ===\n');

// Test 1: Simple HTTP request
console.log('Test 1: Simple HTTP request to 127.0.0.1:5173');
const req1 = http.request({
  hostname: '127.0.0.1',
  port: 5173,
  path: '/',
  method: 'GET',
  timeout: 10000
}, (res) => {
  console.log(`  Status: ${res.statusCode}`);
  console.log(`  Headers: ${JSON.stringify(res.headers)}`);
  res.destroy();
  done1();
});
req1.on('error', (e) => {
  console.log(`  Error: ${e.message}`);
  done1();
});
req1.on('timeout', () => {
  console.log('  Timeout');
  req1.destroy();
  done1();
});
req1.end();

let test1Done = false;
function done1() {
  test1Done = true;
  checkAllDone();
}

// Test 2: Raw socket connection
console.log('\nTest 2: Raw TCP socket to 127.0.0.1:5173');
const socket = new net.Socket();
socket.setTimeout(5000);
socket.connect(5173, '127.0.0.1', () => {
  console.log('  Connected! Sending HTTP request...');
  socket.write('GET / HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n');
});
socket.on('data', (data) => {
  console.log(`  Data received! Length: ${data.length}`);
  console.log(`  First 200 chars: ${data.toString().substring(0, 200)}`);
  socket.destroy();
  done2();
});
socket.on('timeout', () => {
  console.log('  Socket timeout');
  socket.destroy();
  done2();
});
socket.on('error', (e) => {
  console.log(`  Socket error: ${e.message}`);
  done2();
});

let test2Done = false;
function done2() {
  test2Done = true;
  checkAllDone();
}

function checkAllDone() {
  if (test1Done && test2Done) {
    console.log('\n=== Tests complete ===');
    process.exit(0);
  }
}