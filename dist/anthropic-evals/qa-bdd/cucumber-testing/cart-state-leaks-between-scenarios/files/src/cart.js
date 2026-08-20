class Cart {
  constructor() {
    this.lines = [];
    this.discount = 0;
  }

  add(sku, qty, price) {
    this.lines.push({ sku, qty, price });
  }

  itemCount() {
    return this.lines.reduce((n, line) => n + line.qty, 0);
  }

  subtotal() {
    return this.lines.reduce((n, line) => n + line.qty * line.price, 0);
  }

  applyPromo(code) {
    this.discount = code === 'WELCOME10' ? 0.1 : 0;
    return this.discount > 0;
  }

  total() {
    return Number((this.subtotal() * (1 - this.discount)).toFixed(2));
  }
}

module.exports = { Cart };
