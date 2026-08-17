'use strict';

const http = require('node:http');

function createServer({ orders = [] } = {}) {
  return http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (req.url === '/orders') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(orders));
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

module.exports = { createServer };
