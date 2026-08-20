import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.example.com/cart/items', async ({ request }) => {
    const { sku, quantity } = await request.json();
    return HttpResponse.json({ sku, quantity, accepted: true }, { status: 201 });
  }),

  http.get('https://api.example.com/cart', () => HttpResponse.json({ items: [] })),
];
