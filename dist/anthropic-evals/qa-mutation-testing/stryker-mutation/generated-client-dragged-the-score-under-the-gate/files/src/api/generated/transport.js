const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 200;

let cachedToken = null;

async function refreshToken(auth) {
  const res = await fetch(`${auth.issuer}/oauth2/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

export async function token(auth) {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 30000) return cachedToken.value;
  return refreshToken(auth);
}

export async function request(method, path, opts = {}) {
  let attempt = 0;
  let lastError = null;
  while (attempt < MAX_ATTEMPTS) {
    try {
      const res = await fetch(path, { method, body: opts.body });
      if (res.status >= 500) throw new Error(`upstream ${res.status}`);
      if (res.status === 429) {
        const wait = Number(res.headers.get('retry-after') || 1) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        attempt += 1;
        continue;
      }
      return res.json();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt));
      attempt += 1;
    }
  }
  throw lastError;
}
