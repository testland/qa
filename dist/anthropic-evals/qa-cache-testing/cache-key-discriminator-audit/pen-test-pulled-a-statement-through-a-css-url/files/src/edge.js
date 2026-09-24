'use strict';

const { classify } = require('./cdn');

function originTtl(res, fallback) {
  const cc = String(res.headers['cache-control'] || '').toLowerCase();
  if (cc.includes('no-store') || cc.includes('private')) return 0;
  const m = /max-age=(\d+)/.exec(cc);
  return m ? Number(m[1]) : fallback;
}

function createEdge(origin, clock = () => Date.now()) {
  const store = new Map();
  return {
    stored: () => [...store.keys()],
    request(req) {
      const entry = store.get(req.url);
      if (entry && entry.expiresAt > clock()) {
        return { ...entry.res, servedFrom: 'edge' };
      }
      const res = origin(req);
      const rule = classify(req, res);
      if (rule && rule.store) {
        const ttl = rule.honorOriginHeaders ? originTtl(res, rule.ttlSeconds) : rule.ttlSeconds;
        if (ttl > 0) store.set(req.url, { res, expiresAt: clock() + ttl * 1000 });
      }
      return { ...res, servedFrom: 'origin' };
    },
  };
}

module.exports = { createEdge };
