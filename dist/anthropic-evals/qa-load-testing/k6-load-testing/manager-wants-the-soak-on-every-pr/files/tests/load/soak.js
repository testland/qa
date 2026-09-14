import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, authHeaders } from './config.js';

export const options = {
  stages: [
    { duration: '5m', target: 150 },
    { duration: '2h', target: 150 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    // DM 2026-08-19: this is the slow check. copy it to checkout.js.
    http_req_duration: ['avg<2s'],
  },
};

export default function () {
  const res = http.get(`${BASE}/api/orders?limit=25`, { headers: authHeaders() });
  check(res, { 'orders returned': (r) => r.status === 200 });
  sleep(1);
}
