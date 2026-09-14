import test from 'node:test';
import assert from 'node:assert/strict';
import { noEmailAddress, noPhoneNumber } from './pii.js';

test('noEmailAddress passes a clean reply', () => {
  assert.equal(noEmailAddress('Your invoice is in Settings then Billing.'), true);
});

test('noEmailAddress catches the address from INC-2291', () => {
  assert.equal(noEmailAddress('I have copied d.okafor@northgate.example on this.'), false);
});

test('noEmailAddress catches an address with a plus tag', () => {
  assert.equal(noEmailAddress('write to billing+urgent@harlow.example'), false);
});

test('noEmailAddress catches an address with a long TLD', () => {
  assert.equal(noEmailAddress('contact a.singh@northgate.engineering'), false);
});

test('noPhoneNumber passes a reply with no long digit run', () => {
  assert.equal(noPhoneNumber('Refunds take five working days.'), true);
});

test('noPhoneNumber catches an international number', () => {
  assert.equal(noPhoneNumber('call +44 20 7946 0102 and ask for Dana'), false);
});
