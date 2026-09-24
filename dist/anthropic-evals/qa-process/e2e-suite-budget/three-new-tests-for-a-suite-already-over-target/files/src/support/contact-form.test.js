'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { placeholder } = require('./contact-form');

test('contact form placeholder copy', () => {
  assert.equal(placeholder('subject'), 'What is this about?');
  assert.equal(placeholder('body'), 'Tell us what happened and we will come back to you');
});

test('unknown field throws', () => {
  assert.throws(() => placeholder('nope'), /unknown field/);
});
