const BASE = 'https://api.example.com';

export function buildUrl(path, params = {}) {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function apiFetch(path, { token, params } = {}) {
  const res = await fetch(buildUrl(path, { ...params, access_token: token }), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json();
}

export function listUsers({ token, page, perPage }) {
  return apiFetch('/users', { token, params: { page, per_page: perPage } });
}

export function searchUsers({ token, query }) {
  return apiFetch('/users/search', { token, params: { q: query } });
}
