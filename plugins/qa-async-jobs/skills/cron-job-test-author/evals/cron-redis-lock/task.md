# The nightly invoice job's Redis lock let us down twice

## Problem Description

Fix both problems from `incident.md` in `jobs/nightlyInvoices.js` and add tests that would have caught them.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: jobs/nightlyInvoices.js ===============
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

=============== FILE: incident.md ===============
# 31 Oct and 1 Nov

31 Oct: customers got duplicate invoices. Logs: pod-a took the lock at 02:00:00, pod-b took the
lock at 02:05:01 and also generated invoices, pod-a finished at 02:09:12.

1 Nov: pod-b took the lock at 02:00:00 and was OOM-killed at 02:01. pod-a and pod-c logged
"another instance is running, skipping". No invoices were generated for that night until
someone noticed two days later.
