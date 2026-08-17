export class InvalidPhone extends Error {
  constructor(value) {
    super(`not an E.164 number: ${value}`);
    this.name = 'InvalidPhone';
  }
}

export function isE164(value) {
  return /^\+[1-9]\d{7,14}$/.test(String(value));
}

export function registerContact(store, contact) {
  if (!isE164(contact.phone)) {
    throw new InvalidPhone(contact.phone);
  }
  store.push(contact);
  return contact;
}
