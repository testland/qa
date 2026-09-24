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
      // 2026-09-09: stamped on so the appliance can tell the arms apart
      'x-experiment-bucket': bucket,
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
