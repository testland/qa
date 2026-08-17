import { rest } from 'msw';

export const handlers = [
  rest.get('https://api.example.com/orders/:id', (req, res, ctx) =>
    res(ctx.status(200), ctx.json({ id: req.params.id, status: 'shipped', total: 4200 })),
  ),

  rest.post('https://api.example.com/orders', async (req, res, ctx) => {
    const draft = await req.json();
    return res(ctx.status(201), ctx.json({ id: 'ord-9', ...draft }));
  }),
];
