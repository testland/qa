import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/invoices', () =>
    HttpResponse.json([
      { id: 'inv-1', amountCents: 120000, paid: false, dueDays: -3 },
      { id: 'inv-2', amountCents: 45000, paid: true, dueDays: 12 },
      { id: 'inv-3', amountCents: 8000, paid: false, dueDays: 5 },
    ]),
  ),
];
