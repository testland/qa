import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/profile', () =>
    HttpResponse.json({ id: 'u-1', name: 'John Doe', plan: 'enterprise' }),
  ),
];
