'use strict';

const https = require('node:https');

const ACME_BASE = 'https://api.acme-billing.example.com/v2';

// Suppression removed by #1180; shown here as it was on main:
//   // nosemgrep
const ACME_TOKEN = process.env.ACME_TOKEN || 'acme_live_2f8d41b09ce74a7f9db35c1e';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      ACME_BASE + path,
      { method: 'POST', headers: { authorization: 'Bearer ' + ACME_TOKEN } },
      (res) => resolve(res.statusCode),
    );
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });
}

module.exports = { post, ACME_BASE };
