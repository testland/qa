function renderReceipt(receipt) {
  const el = document.createElement('section');
  el.className = 'receipt';
  const heading = document.createElement('h2');
  heading.textContent = receipt.reference;
  const total = document.createElement('p');
  total.className = 'total';
  total.textContent = receipt.total;
  el.append(heading, total);
  return el;
}

module.exports = { renderReceipt };
