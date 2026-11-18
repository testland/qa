# The daily report runs twice since we changed its time

## Problem Description

Our daily report job runs twice since we changed its time, and its time shifts with daylight saving (`docs/issue.md`). Fix `src/schedule.ts` and add tests.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: package.json ===============
{
  "name": "reports",
  "type": "module",
  "dependencies": {
    "bullmq": "^5.40.0"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}

=============== FILE: src/schedule.ts ===============
import { Queue } from 'bullmq';

export const queue = new Queue('reports', { connection: { host: 'redis', port: 6379 } });

// called on every app start
export async function scheduleDailyReport() {
  // was '0 6 * * *' until release 2.4
  await queue.add('daily-report', { kind: 'sales' }, { repeat: { pattern: '0 7 * * *' } });
}

=============== FILE: docs/issue.md ===============
- Since release 2.4 (moved the report from 06:00 to 07:00) the report runs at 06:00 and at 07:00.
- The team is in Berlin. Since the clocks changed in late October the report arrives an hour early.
