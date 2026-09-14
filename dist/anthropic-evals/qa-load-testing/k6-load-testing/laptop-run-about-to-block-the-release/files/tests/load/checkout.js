import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m',  target: 200 },
    { duration: '20m', target: 200 },
    { duration: '5m',  target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed:   ['rate<0.02'],
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
  check(res, { 'order reached confirmed': (r) => r.json('state') === 'confirmed' });
  sleep(1);
}
