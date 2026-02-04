
const https = require('https');

const agent = new https.Agent({
    rejectUnauthorized: false
});

console.log('Fetching data from https://localhost:3000/api/admin/data ...');

const req = https.get('https://localhost:3000/api/admin/data', { agent }, (res) => {
    console.log(`Connected! Status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Body:', data);
    });
});

req.on('error', (err) => {
    console.error('Request Error Object:', err);
    console.error('Request Error Message:', err.message);
    console.error('Request Error Code:', err.code);
});

req.end();
