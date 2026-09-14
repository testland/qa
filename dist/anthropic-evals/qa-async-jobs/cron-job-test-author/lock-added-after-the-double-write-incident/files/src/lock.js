'use strict';

const fs = require('node:fs');

const STALE_AFTER_MS = 60 * 1000;

// Returns true if this process now owns the lock, false if another run holds it.
function acquire(lockPath) {
  try {
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
    if (ageMs > STALE_AFTER_MS) {
      fs.rmSync(lockPath, { force: true });
      return acquire(lockPath);
    }
    return false;
  }
}

function release(lockPath) {
  fs.rmSync(lockPath, { force: true });
}

function holderPid(lockPath) {
  return Number(fs.readFileSync(lockPath, 'utf8'));
}

module.exports = { acquire, release, holderPid, STALE_AFTER_MS };
