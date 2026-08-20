'use strict';

function createAsyncMemo(loader) {
  const settled = new Map();
  const inFlight = new Map();

  return async function memo(key) {
    if (settled.has(key)) {
      return settled.get(key);
    }
    if (inFlight.has(key)) {
      return inFlight.get(key);
    }
    const promise = Promise.resolve(loader(key)).then((value) => {
      settled.set(key, value);
      inFlight.delete(key);
      return value;
    });
    inFlight.set(key, promise);
    return promise;
  };
}

module.exports = { createAsyncMemo };
