import { ordersRepo } from './data.js';

const AUTH_BASE = process.env.AUTH_BASE ?? 'https://auth.staging.parcelly.dev';

export async function contextFor({ req }) {
  const header = req.headers.authorization ?? '';
  const dataSources = { orders: ordersRepo };

  if (!header.startsWith('Bearer ')) {
    return { user: null, dataSources };
  }

  const res = await fetch(`${AUTH_BASE}/introspect`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: header.slice(7) }),
  });

  if (!res.ok) {
    throw new Error(`introspect failed: ${res.status}`);
  }

  const claims = await res.json();
  if (!claims.active) {
    return { user: null, dataSources };
  }

  return {
    user: { id: claims.sub, email: claims.email, tenantId: claims.tenant },
    dataSources,
  };
}
