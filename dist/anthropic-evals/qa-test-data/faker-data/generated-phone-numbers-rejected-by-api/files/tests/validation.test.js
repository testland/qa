import { expect, test } from 'vitest';
import { InvalidPhone, isE164, registerContact } from '../src/validation.js';

test('an E.164 number is accepted', () => {
  expect(isE164('+14155550123')).toBe(true);
});

test('a nationally formatted number is rejected', () => {
  expect(isE164('(415) 555-0123')).toBe(false);
});

test('registering a contact with a bad number throws', () => {
  expect(() => registerContact([], { phone: '415-555-0123' })).toThrow(
    InvalidPhone,
  );
});
