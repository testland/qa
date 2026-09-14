'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { routeEvent } = require('./eventRouter');

const received = [];
const rejected = [];

function verify(rawBody, header, secret) {
  const parts = Object.fromEntries(
    String(header || '')
      .split(',')
      .map((p) => p.trim().split('=')),
  );
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody}`, 'utf8')
    .digest('hex');
  if (expected !== parts.v1) throw new Error('signature mismatch');
  return JSON.parse(rawBody);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/debug/events') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(received));
  }
  if (req.method === 'GET' && req.url === '/debug/rejected') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(rejected));
  }
  if (req.method !== 'POST' || req.url !== '/webhooks/stripe') {
    res.writeHead(404);
    return res.end();
  }
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    try {
      const event = verify(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
      received.push(event);
      routeEvent(event, {
        'payment_intent.succeeded': () => {},
        'payment_intent.payment_failed': () => {},
        'charge.refunded': () => {},
      });
      res.writeHead(200);
      res.end(JSON.stringify({ received: true }));
    } catch (err) {
      rejected.push({ at: new Date().toISOString(), error: err.message });
      res.writeHead(400);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(Number(process.env.PORT || 3000));
