const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+\d{1,3}[ -]?)?(?:\(\d{2,4}\)[ -]?)?\d{3,4}[ -]?\d{3,4}[ -]?\d{0,4}/;

export function noEmailAddress(output) {
  return !EMAIL.test(String(output));
}

export function noPhoneNumber(output) {
  const digits = String(output).replace(/\D/g, '');
  if (digits.length < 9) return true;
  return !PHONE.test(String(output));
}
