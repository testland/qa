'use strict';

const { test } = require('node:test');
const { db } = require('../../src/db');

function withRollback(name, fn) {
  test(name, async (t) => {
    await db.query('BEGIN');
    try {
      await fn(t);
    } finally {
      await db.query('ROLLBACK');
    }
  });
}

module.exports = { withRollback };
