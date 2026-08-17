'use strict';

function createPool({ max = 5 } = {}) {
  const free = [];
  let created = 0;
  let inUse = 0;

  function acquire() {
    if (free.length === 0 && created >= max) {
      throw new Error(`connection pool exhausted (max ${max})`);
    }
    const conn =
      free.pop() || { id: (created += 1), open: true };
    inUse += 1;
    return conn;
  }

  function release(conn) {
    if (!conn) {
      return;
    }
    inUse -= 1;
    free.push(conn);
  }

  return { acquire, release, stats: () => ({ inUse, created, max }) };
}

module.exports = { createPool };
