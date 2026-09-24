import { GraphQLError } from 'graphql';
import { ordersRepo } from './data.js';

function decodeClaims(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch {
    return null;
  }
}

export async function contextFor({ req }) {
  const dataSources = { orders: ordersRepo };
  const header = req.headers.authorization ?? '';

  if (!header.startsWith('Bearer ')) {
    return { user: null, dataSources };
  }

  const claims = decodeClaims(header.slice(7));
  if (!claims) {
    throw new GraphQLError('Malformed token', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  return {
    user: { id: claims.sub, email: claims.email },
    dataSources,
  };
}
