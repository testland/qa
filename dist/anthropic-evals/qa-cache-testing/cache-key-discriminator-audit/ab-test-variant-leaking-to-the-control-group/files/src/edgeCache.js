'use strict';

function createEdgeCache(clock = () => Date.now()) {
  const entries = new Map();

  function primaryKey(req) {
    return `${req.method}|${req.headers.host}|${req.url}`;
  }

  function varyNames(headers) {
    const v = headers.vary;
    if (!v) return [];
    return v.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }

  function directives(headers) {
    return String(headers['cache-control'] || '')
      .split(',')
      .map((s) => s.trim().toLowerCase());
  }

  function maxAge(headers) {
    const d = directives(headers).find((s) => s.startsWith('max-age='));
    return d ? Number(d.slice('max-age='.length)) : 0;
  }

  return {
    size: () => entries.size,
    variants: () => [...entries.values()].reduce((n, list) => n + list.length, 0),

    lookup(req) {
      const stored = entries.get(primaryKey(req));
      if (!stored) return null;
      for (const entry of stored) {
        if (entry.expiresAt <= clock()) continue;
        if (entry.names.includes('*')) continue;
        const matches = entry.names.every(
          (name) => (req.headers[name] ?? null) === entry.nominated[name],
        );
        if (matches) {
          return { status: entry.status, headers: entry.headers, body: entry.body };
        }
      }
      return null;
    },

    store(req, res) {
      const d = directives(res.headers);
      if (d.includes('private') || d.includes('no-store')) return false;
      const ttl = maxAge(res.headers);
      if (ttl <= 0) return false;
      const names = varyNames(res.headers);
      const nominated = {};
      for (const name of names) nominated[name] = req.headers[name] ?? null;
      const key = primaryKey(req);
      const stored = entries.get(key) ?? [];
      stored.push({
        status: res.status,
        headers: res.headers,
        body: res.body,
        names,
        nominated,
        expiresAt: clock() + ttl * 1000,
      });
      entries.set(key, stored);
      return true;
    },
  };
}

module.exports = { createEdgeCache };
