import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m',  target: 300 },
    { duration: '10m', target: 300 },
    { duration: '2m',  target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    http_req_failed:   ['rate<0.25'],
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const res = http.post(
    `${BASE}/api/orders`,
    JSON.stringify({ sku: 'SKU-1', qty: 1 }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'order accepted': (r) => r.status === 201 });
  sleep(1);
}
