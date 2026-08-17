const BASE = 'https://api.example.com';

export async function addItem(sku, quantity) {
  const res = await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, quantity }),
  });
  if (!res.ok) throw new Error(`add item failed: ${res.status}`);
  return res.json();
}

export async function getCart() {
  const res = await fetch(`${BASE}/cart`);
  if (!res.ok) throw new Error(`cart request failed: ${res.status}`);
  const cart = await res.json();
  return {
    ...cart,
    total: cart.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  };
}
