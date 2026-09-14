const store = new Map();
let nextId = 1;

function createWebhook(body) {
  const id = `wh_${nextId++}`;
  const record = { id, url: body.url, secret: `whsec_${id}`, disabled: false };
  store.set(id, record);
  return { status: 201, body: { id: record.id, url: record.url, secret: record.secret } };
}

function listWebhooks() {
  const data = [...store.values()].map((w) => ({ id: w.id, url: w.url }));
  return { status: 200, body: { data, nextCursor: null } };
}

function getWebhook(id) {
  const record = store.get(id);
  if (!record) return { status: 404, body: { error: 'not_found' } };
  return { status: 200, body: { id: record.id, url: record.url, disabled: record.disabled } };
}

function disableWebhook(id) {
  const record = store.get(id);
  if (!record) return { status: 404, body: { error: 'not_found' } };
  record.disabled = true;
  return { status: 200, body: { id: record.id, url: record.url, disabled: true } };
}

export const routes = [
  { method: 'POST', path: '/v1/webhooks', handler: (_id, body) => createWebhook(body) },
  { method: 'GET', path: '/v1/webhooks', handler: () => listWebhooks() },
  { method: 'GET', path: '/v1/webhooks/:id', handler: (id) => getWebhook(id) },
  { method: 'POST', path: '/v1/webhooks/:id/disable', handler: (id) => disableWebhook(id) },
];

export function handle(method, path, body = {}) {
  for (const route of routes) {
    const pattern = new RegExp(`^${route.path.replace(':id', '([^/]+)')}$`);
    const match = pattern.exec(path);
    if (match && route.method === method) return route.handler(match[1], body);
  }
  return { status: 404, body: { error: 'no_route' } };
}

export function reset() {
  store.clear();
  nextId = 1;
}
