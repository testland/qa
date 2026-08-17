import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/quotes/:symbol', () =>
    HttpResponse.json({ price: 101.5, currency: 'USD' }),
  ),
];
