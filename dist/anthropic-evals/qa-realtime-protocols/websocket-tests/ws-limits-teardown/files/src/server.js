import http from 'node:http';
import { WebSocketServer } from 'ws';

export function startChat(port = 8080) {
  const server = http.createServer();
  // big pasted messages were rejected, so the limit was turned off; compression saves bandwidth
  const wss = new WebSocketServer({ server, perMessageDeflate: true, maxPayload: 0 });
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      for (const client of wss.clients) client.send(data.toString());
    });
  });
  server.listen(port);
  return { server, wss };
}
