# Transport server setup

Both transports expose an identical async-iterator surface via `client.iterate()`,
so the same test patterns are portable once the server is up.

## Server setup (graphql-ws over ws)

Per [the-guild.dev/graphql/ws/get-started](https://the-guild.dev/graphql/ws/get-started):

```typescript
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';
import { schema } from './schema';

export function startWsServer(port = 0) {
  const wss = new WebSocketServer({ port });
  const dispose = useServer({ schema }, wss);
  return { wss, dispose };
}
```

Use `port: 0` so the OS assigns a free port - parallel-test safe.

## Server setup (graphql-sse over Node http)

Per [the-guild.dev/graphql/sse/get-started](https://the-guild.dev/graphql/sse/get-started):

```typescript
import { createServer } from 'http';
import { createHandler } from 'graphql-sse/lib/use/http';
import { schema } from './schema';

export function startSseServer() {
  const handler = createHandler({ schema });
  const server = createServer((req, res) => {
    if (req.url === '/graphql/stream') return handler(req, res);
    res.writeHead(404).end();
  });
  server.listen(0);
  const { port } = server.address() as { port: number };
  return { server, url: `http://localhost:${port}/graphql/stream` };
}
```
