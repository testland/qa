const { createHash } = require('node:crypto');

function checksum(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return createHash('sha256').update(bytes).digest('hex');
}

function shortChecksum(payload) {
  return checksum(payload).slice(0, 12);
}

module.exports = { checksum, shortChecksum };
