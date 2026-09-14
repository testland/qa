function cartTotalCents(lines) {
  return lines.reduce((sum, line) => {
    if (line.quantity < 0) throw new RangeError('quantity must not be negative');
    return sum + line.unitCents * line.quantity;
  }, 0);
}

module.exports = { cartTotalCents };
