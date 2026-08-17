import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.get('https://api.example.com/profile', () =>
    HttpResponse.json({
      id: 'u-1',
      display_name: 'Ada Lovelace',
      plan: 'pro',
      seats: 25,
    }),
  ),
);
