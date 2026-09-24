'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { lint } = require('./context-lint');

const wrap = (inner) => '<context><name>x</name>' + inner + '</context>';

test('a literal password is reported', () => {
  const problems = lint(wrap('<password>hunter2</password>'));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /literal password/);
});

test('an environment reference is accepted', () => {
  assert.deepEqual(lint(wrap('<password>${ZAP_PASSWORD}</password>')), []);
  assert.deepEqual(lint(wrap('<username>%ZAP_USER%</username>')), []);
});

test('an empty credential element is accepted', () => {
  assert.deepEqual(lint(wrap('<password></password>')), []);
});

test('a context with no name is reported', () => {
  assert.deepEqual(lint('<context></context>'), ['context has no name']);
});
