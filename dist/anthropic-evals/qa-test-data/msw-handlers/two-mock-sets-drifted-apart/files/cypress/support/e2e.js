import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';

const worker = setupWorker(
  http.get('https://api.example.com/profile', () =>
    HttpResponse.json({
      id: 'u-1',
      displayName: 'Ada Lovelace',
      plan: { tier: 'pro', seats: 25 },
    }),
  ),
);

before(() => worker.start({ onUnhandledRequest: 'error' }));
