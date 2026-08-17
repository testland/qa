import { expect, test } from 'vitest';
import { normalizeContact } from '../src/contact.js';
import { makeContact } from './factories/contact.js';

test('normalizing lowercases and trims the email', () => {
  const contact = makeContact({ email: '  Person@Example.com ' });
  expect(normalizeContact(contact).email).toBe('person@example.com');
});

test('normalizing leaves the id untouched', () => {
  const contact = makeContact();
  expect(normalizeContact(contact).id).toBe(contact.id);
});
