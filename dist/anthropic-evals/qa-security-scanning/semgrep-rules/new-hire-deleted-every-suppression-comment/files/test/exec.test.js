const test = require('node:test');
const assert = require('node:assert');
const { runTool, toolBanner, ALLOWED } = require('../src/util/exec.js');

test('runTool rejects a tool outside the allowlist', () => {
  assert.throws(() => runTool('rm', ['-rf', '/tmp/x']), /tool not allowed/);
});

test('the banner lists the allowed tools in order', () => {
  assert.strictEqual(toolBanner(), 'tools: pdftotext, qpdf');
});

test('the allowlist is exactly the two pdf tools', () => {
  assert.deepStrictEqual([...ALLOWED].sort(), ['pdftotext', 'qpdf']);
});
