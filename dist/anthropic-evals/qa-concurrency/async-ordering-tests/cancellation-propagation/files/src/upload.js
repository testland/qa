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
