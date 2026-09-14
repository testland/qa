const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { resolveUploadPath, describeUpload, UPLOAD_ROOT } = require('../src/api/upload.js');

test('resolves a filename under the tenant root', () => {
  const p = resolveUploadPath('t_42', 'invoice.pdf');
  assert.strictEqual(p, path.join(UPLOAD_ROOT, 't_42', 'invoice.pdf'));
});

test('rejects a filename that climbs out of the tenant root', () => {
  assert.throws(() => resolveUploadPath('t_42', '../t_43/secret.pdf'), /escapes tenant root/);
});

test('rejects an absolute filename', () => {
  assert.throws(() => resolveUploadPath('t_42', '/etc/passwd'), /escapes tenant root/);
});

test('describeUpload carries the resolved path', () => {
  const d = describeUpload('t_42', 'a.pdf', 120);
  assert.strictEqual(d.bytes, 120);
  assert.strictEqual(d.path, path.join(UPLOAD_ROOT, 't_42', 'a.pdf'));
});
