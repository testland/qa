const API = process.env.MAIL_API ?? 'http://localhost:8025';
const APP = process.env.APP_URL ?? 'http://localhost:3000';

export async function clearInbox() {
  const res = await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`clear failed: ${res.status}`);
}

export async function trigger(path, email) {
  const res = await fetch(`${APP}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`trigger ${path} failed: ${res.status}`);
}

export async function waitForMessage(to, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages = [] } = await res.json();
    if (messages.length) return messages[0];
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for mail to ${to}`);
}

export async function openMessage(id) {
  const res = await fetch(`${API}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`fetch ${id} failed: ${res.status}`);
  return res.json();
}

export async function latestMessage() {
  const res = await fetch(`${API}/api/v1/messages`);
  const { messages = [] } = await res.json();
  return messages[0];
}
