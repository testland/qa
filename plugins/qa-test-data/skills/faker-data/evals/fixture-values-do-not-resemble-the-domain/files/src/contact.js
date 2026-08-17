export function normalizeContact(contact) {
  return {
    ...contact,
    email: contact.email.trim().toLowerCase(),
    phone: contact.phone.replace(/[^\d+]/g, ''),
    postcode: contact.postcode.trim().toUpperCase(),
  };
}

export function isDeliverable(contact) {
  return Boolean(
    contact.line1 &&
      contact.city &&
      /^\d{5}(-\d{4})?$/.test(String(contact.postcode).trim()),
  );
}

export function isAdult(contact, today = new Date()) {
  const dob = new Date(contact.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const years = (today.getTime() - dob.getTime()) / 31557600000;
  return years >= 18;
}

export function escapeName(name) {
  return String(name)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function maskAccountNumber(accountNumber) {
  const digits = String(accountNumber).replace(/\D/g, '');
  return digits.length <= 4 ? '****' : `****${digits.slice(-4)}`;
}
