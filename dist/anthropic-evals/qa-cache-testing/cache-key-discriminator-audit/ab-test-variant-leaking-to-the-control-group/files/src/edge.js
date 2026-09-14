'use strict';

const { renderPricing } = require('./pricing');

const TRACKING_PARAMS = ['utm_source', 'utm_campaign', 'gclid'];

function normalize(req) {
  const [path, query = ''] = req.url.split('?');
  const kept = query
    .split('&')
    .filter((pair) => pair && !TRACKING_PARAMS.includes(pair.split('=')[0]));
  return { ...req, url: kept.length ? `${path}?${kept.join('&')}` : path };
}

function serve(cache, req) {
  const normalized = normalize(req);
  const hit = cache.lookup(normalized);
  if (hit) return { ...hit, hit: true };
  const res = renderPricing(normalized);
  cache.store(normalized, res);
  return { ...res, hit: false };
}

module.exports = { serve, normalize };
