const API = process.env.MAIL_API ?? 'http://localhost:8025';

export async function search(to) {
  const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
  if (!res.ok) return [];
  const body = await res.json();
  return body.messages ?? [];
}

export async function firstMatch(to, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await search(to);
    if (found.length) return found[0];
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

// PR #1188: was `${API}/api/v2/messages/${id}` on the old server.
export async function fullMessage(id) {
  const res = await fetch(`${API}/api/v1/messages/${id}`);
  return res.ok ? res.json() : {};
}

export function headersOf(msg) {
  return msg.Content?.Headers ?? {};
}

export function bodiesOf(msg) {
  return [msg.Content?.Body].filter(Boolean);
}

export function linksIn(msg) {
  const body = msg.Content?.Body ?? '';
  return [...body.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) => m[0]);
}

export async function clearAll() {
  await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
}

export async function requestReset(email) {
  const res = await fetch(`${process.env.APP_URL ?? 'http://localhost:3000'}/_test/password-reset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`trigger failed: ${res.status}`);
}
