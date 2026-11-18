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
