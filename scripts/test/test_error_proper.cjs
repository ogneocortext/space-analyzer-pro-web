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
  
  let responseData = '';
  res.on('data', (d) => {
    responseData += d;
  });
  
  res.on('end', () => {
    console.log(`Response: ${responseData}`);
  });
});

req.on('error', (error) => {
  console.error(`Request error: ${error.message}`);
});

req.write(data);
req.end();
