'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { uploadAll } = require('./upload');

test('uploads every chunk when not cancelled', async () => {
  const started = [];
  const receipts = await uploadAll(['a', 'b'], {
    signal: new AbortController().signal,
    uploadChunk: async (chunk) => {
      started.push(chunk);
      return `receipt-${chunk}`;
    },
  });

  assert.deepEqual(started, ['a', 'b']);
  assert.deepEqual(receipts, ['receipt-a', 'receipt-b']);
});

test('rejects when aborted before it starts', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    () => uploadAll(['a'], { signal: controller.signal, uploadChunk: async () => 'x' }),
    { name: 'AbortError' },
  );
});
