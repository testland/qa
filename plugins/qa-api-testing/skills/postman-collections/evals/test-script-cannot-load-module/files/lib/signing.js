const crypto = require('crypto');

function hmacSha256(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

module.exports = { hmacSha256 };
