const test = require('node:test');
const assert = require('node:assert');
const { buildCommand, ALLOWED_TOOLS } = require('../lib/shell.js');

test('rejects a tool that is not on the allowlist', () => {
  assert.throws(() => buildCommand('curl', ['http://example.test']), /not allowed/);
});

test('allowlist holds the four approved tools', () => {
  assert.deepStrictEqual([...ALLOWED_TOOLS].sort(), ['convert', 'git', 'pdftotext', 'qpdf']);
});

test('arguments are quoted, not concatenated raw', () => {
  const cmd = buildCommand('pdftotext', ['a b.pdf; curl evil.test']);
  assert.strictEqual(cmd, "pdftotext 'a b.pdf; curl evil.test'");
});

test('embedded single quotes are escaped', () => {
  assert.strictEqual(buildCommand('git', ["it's"]), "git 'it'\\''s'");
});

test('non-array args are rejected', () => {
  assert.throws(() => buildCommand('git', 'status'), TypeError);
});
