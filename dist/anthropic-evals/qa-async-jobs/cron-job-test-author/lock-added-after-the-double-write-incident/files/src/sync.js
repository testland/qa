'use strict';

const { acquire, release } = require('./lock');

async function runSync(lockPath, work) {
  let result;
  try {
    if (!acquire(lockPath)) {
      result = { started: false, reason: 'locked' };
      return result;
    }
    result = { started: true, rows: await work() };
    return result;
  } finally {
    release(lockPath);
    if (process.env.SYNC_TRACE) console.error(`[sync] released ${lockPath}`);
  }
}

module.exports = { runSync };
