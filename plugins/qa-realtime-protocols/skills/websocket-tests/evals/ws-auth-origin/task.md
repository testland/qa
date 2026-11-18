# Fix the WebSocket authentication flagged in the security review

## Problem Description

A security review flagged our WebSocket authentication (`server.js`, `public/client.js`, findings in `docs/review.md`). Fix it and write tests for the handshake.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: server.js ===============
const http = require('http');
const { WebSocketServer } = require('ws');
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const user = sessionFromCookie(req.headers.cookie)
    || userFromToken(new URL(req.url, 'http://x').searchParams.get('token'));
  if (!user) return ws.close();
  subscribeToAccount(ws, user.accountId);
});
server.listen(8080);

=============== FILE: public/client.js ===============
const token = localStorage.getItem('apiToken');   // long-lived API token
const ws = new WebSocket(`wss://app.example.com/live?token=${token}`, {
  headers: { Authorization: `Bearer ${token}` },
});

=============== FILE: docs/review.md ===============
Security review findings:
1. A page on another site could open a WebSocket to app.example.com and read a logged-in user's account stream.
2. Long-lived API tokens appear in the load balancer access logs.
3. Unauthenticated sockets are accepted and only closed afterwards.
4. The `headers` option in client.js does nothing in browsers.
