const REQUIRED = ['sku', 'quantity', 'price'];

function checkHeader(csv) {
  const columns = csv.trim().split('\n')[0].split(',').map((column) => column.trim());
  const missing = REQUIRED.filter((column) => !columns.includes(column));
  if (missing.length) return { accepted: false, message: `Missing columns: ${missing.join(', ')}` };
  return { accepted: true };
}

function importRows(rows) {
  const imported = [];
  const rejected = [];
  for (const { sku, quantity, price } of rows) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      rejected.push({ sku, reason: 'Quantity must be a whole number above zero' });
    } else if (typeof price !== 'number' || price <= 0) {
      rejected.push({ sku, reason: 'Price must be above zero' });
    } else {
      imported.push({ sku, quantity, price });
    }
  }
  return { imported, rejected };
}

module.exports = { checkHeader, importRows };
