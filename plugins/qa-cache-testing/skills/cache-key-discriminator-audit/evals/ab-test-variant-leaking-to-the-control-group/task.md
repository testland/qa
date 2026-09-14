# Pricing test came back 97.6% arm B and I am ready to just stop caching the page

## Problem Description

We started a two-arm test on `/pricing` on Tuesday 2026-09-08. Assignment is
50/50 off the session table and we took 41,200 sessions on day one, but the
beacon came back 97.8% arm B. Marketing spotted it before we did: the "Talk to
sales" call to action, which only exists in arm B, was being screenshotted by
people the session table says were assigned arm A. Four days later the split is
still sitting around 97.6% arm B.

The edge appliance sits in front of the app and holds responses for ten minutes
at a time. Assignment happens inside the app and you can see it in
`src/pricing.js`.

Three things I need from you this morning, and I am giving you my own view on
each so you can tell me where I am wrong.

Dmitri on platform wants to put `Vary: Cookie` on the pricing response, on the
grounds that every visitor has a different cookie so nothing can possibly cross
over. That is the change he has queued for Friday and I want a straight verdict
on it before it goes in.

My own instinct is simpler. If the only way to be certain is to stop letting the
edge hold `/pricing` at all, do it. I would rather pay for the origin traffic for
a fortnight than run another week of a test we cannot report on. Tell me what
that would actually cost us before I sign it off - `reports/experiment-4471.md`
has what the edge is reporting and `ops/origin-capacity.md` has what happened the
last time this route went to the origin.

And if there is anything else wrong with what that route is putting into a
shared box, I want to hear about it now rather than in the next pen test.

`src/edgeCache.js` is our model of the appliance. It was written off the
vendor's own caching documentation, it has a passing test suite, and it is the
thing we reason about whenever we change headers. Treat it as the real
appliance: do not edit it to make something turn green.

## Output Specification

1. Change `/pricing` so that two visitors the experiment put in different arms
   cannot be served each other's body through the edge. Everything under `src/`
   is ours except `src/edgeCache.js`, which you must not edit.
2. Add `src/pricing.test.js` with a test that fails against the code as it
   stands today and passes after your change, driving two visitors in different
   arms through one shared edge cache instance.
3. Write `docs/incident-4471.md`: what is actually wrong and at which layer,
   your verdict on Dmitri's `Vary: Cookie` change with the reason, your answer
   on taking `/pricing` off the edge with the numbers behind it, and anything
   else you found on that route.
4. `npm test` must pass. The six tests in `src/edgeCache.test.js` and
   `src/serve.test.js` are shipped and passing; do not edit or delete any of
   them.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront-edge",
  "version": "3.4.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/edgeCache.js ===============
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

=============== FILE: src/pricing.js ===============
'use strict';

const COPY = {
  a: { headline: 'Simple pricing', cta: 'Start free' },
  b: { headline: 'Pick the plan that fits', cta: 'Talk to sales' },
};

function assignBucket(visitorId) {
  let h = 0;
  for (const ch of String(visitorId)) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h % 2 === 0 ? 'a' : 'b';
}

function renderPricing(req) {
  const bucket = assignBucket(req.session.visitorId);
  const copy = COPY[bucket];
  return {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=600',
      vary: 'Accept-Language, X-Experiment-Bucket',
    },
    body: JSON.stringify({
      headline: copy.headline,
      cta: copy.cta,
      arm: bucket,
      currentPlan: req.session.plan,
    }),
  };
}

module.exports = { renderPricing, assignBucket, COPY };

=============== FILE: src/edge.js ===============
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

=============== FILE: src/edgeCache.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createEdgeCache } = require('./edgeCache');

const req = (headers = {}) => ({
  method: 'GET',
  url: '/pricing',
  headers: { host: 'shop.example.com', ...headers },
});

const res = (body, headers = {}) => ({
  status: 200,
  headers: { 'cache-control': 'public, max-age=600', ...headers },
  body,
});

test('a stored response is reused for an identical request', () => {
  const cache = createEdgeCache();
  cache.store(req(), res('one'));
  assert.equal(cache.lookup(req()).body, 'one');
});

test('Vary separates entries by the nominated request header', () => {
  const cache = createEdgeCache();
  cache.store(req({ 'accept-language': 'en' }), res('hello', { vary: 'Accept-Language' }));
  assert.equal(cache.lookup(req({ 'accept-language': 'en' })).body, 'hello');
  assert.equal(cache.lookup(req({ 'accept-language': 'fr' })), null);
});

test('a private response is never stored at the edge', () => {
  const cache = createEdgeCache();
  assert.equal(cache.store(req(), res('secret', { 'cache-control': 'private, max-age=600' })), false);
  assert.equal(cache.lookup(req()), null);
});

test('an expired entry is not reused', () => {
  let now = 0;
  const cache = createEdgeCache(() => now);
  cache.store(req(), res('one'));
  now = 600_001;
  assert.equal(cache.lookup(req()), null);
});

=============== FILE: src/serve.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createEdgeCache } = require('./edgeCache');
const { serve } = require('./edge');

const visitor = (vid, plan, url = '/pricing') => ({
  method: 'GET',
  url,
  headers: { host: 'shop.example.com', cookie: `vid=${vid}` },
  session: { visitorId: vid, plan },
});

test('a campaign parameter does not push the page to the origin again', () => {
  const cache = createEdgeCache();
  assert.equal(serve(cache, visitor('u-8841', 'Team')).hit, false);
  assert.equal(
    serve(cache, visitor('u-8841', 'Team', '/pricing?utm_source=newsletter')).hit,
    true,
  );
});

test('two visitors the experiment put in the same arm are served one stored entry', () => {
  const cache = createEdgeCache();
  const first = serve(cache, visitor('u-8841', 'Team'));
  assert.equal(first.hit, false);
  const second = serve(cache, visitor('u-9002', 'Free'));
  assert.equal(second.hit, true);
  assert.equal(cache.variants(), 1);
});

=============== FILE: reports/experiment-4471.md ===============
# Experiment 4471 - pricing page, two arms

| Day        | Sessions | Arm A assigned | Arm B assigned | Arm A observed | Arm B observed |
|------------|----------|----------------|----------------|----------------|----------------|
| 2026-09-08 | 41,200   | 20,614         | 20,586         | 2.2%           | 97.8%          |
| 2026-09-09 | 39,850   | 19,901         | 19,949         | 2.6%           | 97.4%          |
| 2026-09-10 | 40,105   | 20,070         | 20,035         | 2.5%           | 97.5%          |
| 2026-09-11 | 38,990   | 19,502         | 19,488         | 2.6%           | 97.4%          |

Notes:

- "Assigned" is read from the session table. "Observed" is what the page
  actually rendered, from the front-end beacon.
- Edge TTL on `/pricing` is 600s throughout the window.
- The edge reports a 98.1% hit rate on `/pricing` and 0.9 origin requests a
  second averaged over the window.
- In a ten-minute window the edge is holding 38 distinct stored variants of
  `/pricing`. Dumped and compared, the 38 differ from one another only in the
  `Accept-Language` value recorded against them; 37 of the 38 bodies are
  byte-identical.
- `/pricing` is 12% of all session starts. Peak is Monday 09:00-10:00.

=============== FILE: ops/origin-capacity.md ===============
# Origin pool - capacity notes

Current pool: 6 app instances, 4 workers each.

## Measured

- Sustained ceiling on the pool before p99 latency crosses 2s: **52 requests a
  second** across all routes. Load test 2026-07-14, unchanged since.
- Current origin load across all routes at Monday peak: 31 req/s.
- `/pricing` at Monday peak, if nothing were held at the edge: **68 req/s** on
  its own, taken from the edge's own request counts.

## Incident 2026-06-19

A rule change stopped the edge holding `/pricing` for 41 minutes. The origin
reached the ceiling inside four minutes, the pool shed connections, checkout
error rate went from 0.2% to 11%, and we lost an estimated GBP 46k of orders.
The post-incident action was "never serve /pricing from the origin at peak".
Nobody has written down what to do instead.
