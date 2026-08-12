# Cancelling an upload leaves chunks in flight

## Problem Description

`src/upload.js` uploads a file as a sequence of chunks and accepts an
`AbortSignal` so the user can cancel. Support has seen cancelled uploads
continue to consume bandwidth, which suggests the signal is not reaching the
per-chunk work, or that further chunks start after the cancel.

The existing test aborts before the upload begins. That is the easy case and
it tells us nothing about a cancel that arrives while a chunk is in flight.

## Output Specification

Add `src/upload.test.js` covering cancellation that arrives mid-upload:
that the in-flight chunk is told to stop, that no further chunk is started,
that the caller sees an abort rather than a normal completion, and that
cleanup runs.

Run `npm test` before you finish; it must pass.

Leave `src/upload.basic.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "uploader",
  "version": "2.0.4",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/upload.js ===============
'use strict';

class AbortError extends Error {
  constructor() {
    super('The operation was aborted');
    this.name = 'AbortError';
  }
}

async function uploadAll(chunks, { signal, uploadChunk, onCleanup }) {
  const receipts = [];
  try {
    for (const chunk of chunks) {
      if (signal.aborted) {
        throw new AbortError();
      }
      const receipt = await uploadChunk(chunk, signal);
      if (signal.aborted) {
        throw new AbortError();
      }
      receipts.push(receipt);
    }
    return receipts;
  } finally {
    if (onCleanup) {
      onCleanup({ uploaded: receipts.length, aborted: signal.aborted });
    }
  }
}

module.exports = { uploadAll, AbortError };

=============== FILE: src/upload.basic.test.js ===============
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
