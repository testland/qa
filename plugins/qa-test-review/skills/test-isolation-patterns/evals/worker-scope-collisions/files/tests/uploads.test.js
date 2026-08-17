'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tmpDir } = require('./support/resources');
const uploads = require('../src/uploads');

test('stores an uploaded file', async () => {
  const dir = tmpDir();
  await uploads.save(path.join(dir, 'invoice.pdf'), Buffer.from('%PDF'));
  assert.equal(fs.readdirSync(dir).length, 1);
});

test('rejects an unsupported type', async () => {
  const dir = tmpDir();
  await assert.rejects(() => uploads.save(path.join(dir, 'notes.exe'), Buffer.from('x')));
  assert.equal(fs.readdirSync(dir).length, 0);
});
