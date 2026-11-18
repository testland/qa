const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });

// Runs at 02:00 on all three app replicas (node-cron '0 2 * * *'); the lock makes one of them win.
async function runNightlyInvoices(generate) {
  const got = await redis.set('lock:nightly-invoices', '1', { NX: true, EX: 300 });
  if (!got) {
    console.log('another instance is running, skipping');
    return 'skipped';
  }
  try {
    await generate(); // usually 2 minutes, about 9 minutes at month end
  } finally {
    await redis.del('lock:nightly-invoices');
  }
  return 'done';
}

module.exports = { runNightlyInvoices, redis };
