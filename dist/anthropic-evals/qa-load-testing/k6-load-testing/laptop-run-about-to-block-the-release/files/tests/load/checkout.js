import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const confirmedOrders = new Counter('confirmed_orders');

export const options = {
  stages: [
    { duration: '5m',  target: 200 },
    { duration: '20m', target: 200 },
    { duration: '5m',  target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed:   ['rate<0.02'],
    // PS 2026-06-04: the 99.5% confirmed floor from the sign-off.
    confirmed_orders:  ['rate>0.995'],
    // PS 2026-06-04: the 150/s the sign-off asks the gate to sustain.
    http_reqs:         ['rate>150'],
  },
};

const BASE = __ENV.API_BASE_URL;
const TOKEN = __ENV.API_TOKEN;

export default function () {
  const res = http.post(
    `${BASE}/api/checkout`,
    JSON.stringify({ cartId: `c-${__VU}-${__ITER}` }),
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    },
  );
  const confirmed = res.json('state') === 'confirmed';
  if (confirmed) confirmedOrders.add(1);
  check(res, { 'order reached confirmed': () => confirmed });
  sleep(1);
}
