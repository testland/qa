export class Inventory {
  constructor(items) {
    this.items = items.map((item) => ({ ...item }));
  }

  find(sku) {
    const item = this.items.find((candidate) => candidate.sku === sku);
    if (!item) throw new Error(`unknown sku: ${sku}`);
    return item;
  }

  reserve(sku, quantity) {
    const item = this.find(sku);
    if (item.stock < quantity) throw new Error('insufficient stock');
    item.stock -= quantity;
    return item.stock;
  }

  restock(sku, quantity) {
    const item = this.find(sku);
    item.stock += quantity;
    return item.stock;
  }

  inStock() {
    return this.items.filter((item) => item.stock > 0);
  }
}
