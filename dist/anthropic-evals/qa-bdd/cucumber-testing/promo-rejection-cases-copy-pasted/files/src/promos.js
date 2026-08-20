const CODES = {
  WELCOME10: { valid: true },
  EXPIRED50: { valid: false, message: 'This code has expired' },
  REGION5: { valid: false, message: 'This code is not valid in your region' },
  USEDONCE: { valid: false, message: 'This code has already been used' },
};

function validate(code) {
  if (code === '') return { valid: false, message: 'Please enter a code' };
  const known = CODES[code];
  if (!known) return { valid: false, message: 'Code not found' };
  return known;
}

module.exports = { validate };
