'use strict';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function maskPan(pan) {
  const digits = String(pan).replace(/\D/g, '');
  if (digits.length < 12) throw new Error(`pan too short: ${digits.length} digits`);
  const groups = [];
  let buf = '';
  for (let i = 0; i < digits.length - 4; i += 1) {
    buf += '•';
    if (buf.length === 4) {
      groups.push(buf);
      buf = '';
    }
  }
  if (buf) groups.push(buf);
  groups.push(digits.slice(-4));
  return groups.join(' ');
}

function expiryMessage(expiry, now) {
  const [year, month] = String(expiry).split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) throw new Error(`bad expiry: ${expiry}`);
  const firstOfNextMonth = Date.UTC(year, month, 1);
  if (now.getTime() < firstOfNextMonth) return null;
  return `This card expired in ${MONTHS[month - 1]} ${year}`;
}

module.exports = { maskPan, expiryMessage };
