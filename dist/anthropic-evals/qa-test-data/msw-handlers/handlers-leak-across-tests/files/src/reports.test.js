import { expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/node.js';
import { loadDailyReport } from './reports.js';

test('returns the report rows', async () => {
  const report = await loadDailyReport();
  expect(report.rows).toBe(128);
  expect(report.status).toBe('ok');
});

test('marks the report degraded when the service is down', async () => {
  server.use(
    http.get(
      'https://api.example.com/reports/daily',
      () => new HttpResponse(null, { status: 503 }),
    ),
  );

  const report = await loadDailyReport();
  expect(report.status).toBe('degraded');
});
