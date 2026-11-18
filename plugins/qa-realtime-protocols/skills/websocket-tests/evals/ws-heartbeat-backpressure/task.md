# The price WebSocket server leaks memory and keeps ghost clients

## Problem Description

Our price WebSocket server (`server.js`) leaks memory and keeps ghost clients after phones lose signal (`docs/ops-notes.md`). Fix it and write tests for these behaviours.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: server.js ===============
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  if (!isAuthorized(req)) return ws.close(1006, 'unauthorized');
  ws.on('message', (m) => handle(ws, m));
});

setInterval(() => {
  const msg = JSON.stringify(latestPrices());   // ~2 KB
  for (const client of wss.clients) client.send(msg);
}, 50);

=============== FILE: docs/ops-notes.md ===============
- Server memory climbs for hours, then the process is OOM-killed.
- After phones lose signal, their connections stay in wss.clients for hours ("ghost" clients).
- Some clients on slow networks fall minutes behind on prices.
- The unauthorized close throws an error in the logs.
