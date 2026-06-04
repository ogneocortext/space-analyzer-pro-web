const http = require('http');

const data = JSON.stringify({
  message: "test error",
  type: "TestError",
  url: "http://localhost:5175"
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/errors/report',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(`headers: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
