import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, authHeaders } from './config.js';

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '2m', target: 30 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post(
    `${BASE}/api/checkout`,
    JSON.stringify({ cartId: `c-${__VU}-${__ITER}` }),
    { headers: authHeaders({ 'Content-Type': 'application/json' }) },
  );
  check(res, { 'checkout accepted': (r) => r.status === 200 });
  sleep(1);
}
