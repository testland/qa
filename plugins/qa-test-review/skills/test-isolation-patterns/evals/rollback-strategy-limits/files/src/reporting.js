'use strict';

const { createPool } = require('./pool');

const reportingPool = createPool({ max: 4 });

async function dailySummary(day) {
  const conn = await reportingPool.acquire();
  try {
    const rows = await conn.query('SELECT SUM(cents) AS cents FROM invoices WHERE day = ?', [day]);
    return { cents: rows[0].cents || 0 };
  } finally {
    conn.release();
  }
}

module.exports = { dailySummary };
