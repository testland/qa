import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 12 },
    { duration: '8m', target: 12 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const res = http.post(
    `${BASE}/api/checkout`,
    JSON.stringify({ cartId: `c-${__VU}-${__ITER}` }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'checkout accepted': (r) => r.status === 200 });
  sleep(1);
}

export function handleSummary(data) {
  return { 'reports/nightly-summary.json': JSON.stringify(data, null, 2) };
}
