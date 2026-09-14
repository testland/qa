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
