import { readFileSync } from 'node:fs';

const TRACKED_WORKFLOW = 'ci';

export function parseRuns(csv) {
  const [, ...rows] = csv.trim().split('\n');
  return rows.map((line) => {
    const [date, workflow, success, failure, cancelled, skipped] = line.split(',');
    return {
      date,
      workflow,
      success: Number(success),
      failure: Number(failure),
      cancelled: Number(cancelled),
      skipped: Number(skipped),
    };
  });
}

export function loadWindow(path) {
  return parseRuns(readFileSync(path, 'utf8')).filter((r) => r.workflow === TRACKED_WORKFLOW);
}

export function passRate(rows) {
  let passed = 0;
  let ran = 0;
  for (const r of rows) {
    passed += r.success;
    ran += r.success + r.failure;
  }
  return passed / ran;
}

export function round3(n) {
  return Math.round(n * 1000) / 1000;
}
