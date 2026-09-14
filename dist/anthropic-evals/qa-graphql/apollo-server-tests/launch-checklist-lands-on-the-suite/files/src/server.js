import { createServer } from 'node:http';
import express from 'express';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import { typeDefs, resolvers } from './schema.js';
import { depthLimit } from './depth-limit.js';
import { contextFor } from './context.js';

export const schema = makeExecutableSchema({ typeDefs, resolvers });

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  keyGenerator: (req) => req.headers['x-api-key'] ?? req.ip,
  standardHeaders: true,
});

export async function start(port = Number(process.env.PORT ?? 4000)) {
  const app = express();
  const httpServer = createServer(app);

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const wsCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    validationRules: [depthLimit(6)],
    introspection: process.env.NODE_ENV !== 'production',
    plugins: [
      {
        async serverWillStart() {
          return { async drainServer() { await wsCleanup.dispose(); } };
        },
      },
    ],
  });
  await server.start();

  app.use('/graphql', limiter, bodyParser.json(), expressMiddleware(server, { context: contextFor }));

  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  return { httpServer, server };
}
