const test = require('node:test');
const assert = require('node:assert');
const { resetEmail, line } = require('../src/notifier');

test('the reset email carries a subject and a body', () => {
  const mail = resetEmail('sam@example.com');
  assert.strictEqual(mail.to, 'sam@example.com');
  assert.ok(mail.subject.length > 0);
  assert.ok(mail.body.split('\n').length === 3);
});

test('the reset subject reads as english', () => {
  assert.strictEqual(line('reset.subject'), 'Reset your password');
});
