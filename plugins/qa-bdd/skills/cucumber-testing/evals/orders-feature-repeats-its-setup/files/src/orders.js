const state = { authenticated: false, catalogue: new Map(), customers: new Map(), orders: [] };

function reset() {
  state.authenticated = false;
  state.catalogue.clear();
  state.customers.clear();
  state.orders.length = 0;
}

function authenticate(token) {
  state.authenticated = token === 'seed-token';
  return state.authenticated;
}

function listProduct(sku, price) {
  state.catalogue.set(sku, price);
}

function addCustomer(name, confirmed) {
  state.customers.set(name, { confirmed });
}

function placeOrder(name, sku, qty) {
  if (!state.authenticated) throw new Error('Not authenticated');
  if (!state.customers.get(name).confirmed) return { placed: false, reason: 'Email not confirmed' };
  const order = { id: `ORD-${state.orders.length + 1}`, name, total: state.catalogue.get(sku) * qty, status: 'pending' };
  state.orders.push(order);
  return { placed: true, order };
}

function cancel(id) {
  const order = state.orders.find((o) => o.id === id);
  if (order.status !== 'pending') return { cancelled: false, reason: 'Order is not pending' };
  order.status = 'cancelled';
  return { cancelled: true, order };
}

function historyFor(name) {
  return state.orders.filter((o) => o.name === name);
}

module.exports = { reset, authenticate, listProduct, addCustomer, placeOrder, cancel, historyFor };
