import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    ramp_to_peak: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 400,
      maxVUs: 2500,
      stages: [
        { target: 1400, duration: '16m' },
        { target: 1400, duration: '4m' },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed:   ['rate<0.005'],
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const res = http.get(`${BASE}/api/v2/positions?limit=50`);
  check(res, { 'positions returned': (r) => r.status === 200 });
}
