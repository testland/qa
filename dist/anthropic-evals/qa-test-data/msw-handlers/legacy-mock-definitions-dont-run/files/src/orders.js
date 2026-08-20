const BASE = 'https://api.example.com';

export async function getOrder(id) {
  const res = await fetch(`${BASE}/orders/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`order request failed: ${res.status}`);
  return res.json();
}

export async function createOrder(draft) {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  if (res.status !== 201) throw new Error(`create order failed: ${res.status}`);
  return res.json();
}

export async function listOrders(status) {
  const url = new URL(`${BASE}/orders`);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`list orders failed: ${res.status}`);
  return res.json();
}

export function orderLabel(order) {
  return `${order.id} (${order.status})`;
}
