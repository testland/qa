import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada Lovelace' }),
  ),
];
