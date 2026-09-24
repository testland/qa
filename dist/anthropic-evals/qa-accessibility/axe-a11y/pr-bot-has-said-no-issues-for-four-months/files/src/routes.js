export const routes = [
  { path: '/', name: 'home', auth: false },
  { path: '/search', name: 'search', auth: false },
  { path: '/product/:sku', name: 'product', auth: false },
  { path: '/cart', name: 'cart', auth: false },
  { path: '/checkout', name: 'checkout', auth: true },
  { path: '/orders', name: 'order-history', auth: true },
];
