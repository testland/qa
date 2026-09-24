'use strict';

// Prints integer minor units as a statement amount; no posting is read or written here.
function renderAmount(minorUnits) {
  const negative = minorUnits < 0;
  const abs = Math.abs(minorUnits);
  const major = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const minor = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}GBP ${major}.${minor}`;
}

module.exports = { renderAmount };
