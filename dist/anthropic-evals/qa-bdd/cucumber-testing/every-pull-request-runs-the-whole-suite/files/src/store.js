const catalogue = [];

function seedCatalogue(rows) {
  catalogue.length = 0;
  for (let i = 0; i < rows; i += 1) {
    catalogue.push({ sku: `SKU-${i}`, price: (i % 50) + 1 });
  }
}

function salesReport() {
  return {
    lines: catalogue.length,
    revenue: catalogue.reduce((total, row) => total + row.price, 0),
  };
}

module.exports = { seedCatalogue, salesReport };
