function normaliseEmail(input) {
  if (typeof input !== 'string') throw new TypeError('email must be a string');
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.includes('@')) throw new RangeError('not an email address');
  return trimmed;
}

module.exports = { normaliseEmail };
