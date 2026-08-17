import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/reports/daily', () =>
    HttpResponse.json({
      id: 'daily',
      rows: 128,
      generatedAt: '2026-03-01T00:00:00Z',
    }),
  ),
];
