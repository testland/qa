import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  iterations: 50,
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const body = JSON.stringify({ sku: 'SKU-4471', qty: 1, card: 'tok_test_visa' });

export default function () {
  const res = http.post(`${__ENV.BASE_URL}/api/checkout`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${__ENV.API_TOKEN}`,
    },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
