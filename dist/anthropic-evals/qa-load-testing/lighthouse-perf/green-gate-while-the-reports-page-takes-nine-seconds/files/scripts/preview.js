'use strict';

// Serves the production build out of dist/ with a seeded demo tenant, so the
// app routes are reachable without a real login. `npm run preview`.

const http = require('node:http');

const PORT = Number(process.env.PORT || 5173);
const DEMO_SESSION = process.env.PREVIEW_SESSION || 'demo-tenant-8f21ac';

const server = http.createServer((req, res) => {
  // The client router 302s any /app/* request to /login unless the request
  // carries fernbank_session; the demo value below is accepted by the preview
  // build only.
  res.setHeader('x-preview', '1');
  res.end('preview');
});

server.listen(PORT, () => {
  console.log('  Local:   http://localhost:' + PORT + '/');
  console.log('  Demo session cookie: fernbank_session=' + DEMO_SESSION);
});
