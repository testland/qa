import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { typeDefs, resolvers } from './schema.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// INC-4502 (Meridian finding 2): strip the suggestion before a client sees it.
const SUGGESTION = /^Cannot query field ".+" on type ".+"\. Did you mean .+\?$/;

export function buildServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: !IS_PRODUCTION,
    formatError: (formatted) =>
      SUGGESTION.test(formatted.message)
        ? { ...formatted, message: 'Bad request' }
        : formatted,
  });
}

export async function start() {
  const server = buildServer();
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT ?? 4000) },
  });
  console.log(`parcelly-api ready at ${url}`);
}
