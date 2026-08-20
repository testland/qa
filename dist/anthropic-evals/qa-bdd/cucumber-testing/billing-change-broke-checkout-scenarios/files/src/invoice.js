function setField(invoice, field, value) {
  if (field !== 'reference') return { message: `Unknown field: ${field}` };
  if (!value) return { message: 'Reference is required' };
  invoice.reference = value;
  return { message: 'Saved' };
}

module.exports = { setField };
