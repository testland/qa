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
