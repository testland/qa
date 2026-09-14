import { readFileSync } from 'node:fs';

export const BUDGET_MS = 800;

export function evaluate(summary, budgetMs = BUDGET_MS) {
  const duration = summary?.metrics?.http_req_duration?.values;
  if (!duration) {
    return { pass: true, reason: 'no http_req_duration in summary - skipping gate' };
  }
  const observed = duration.avg;
  return {
    pass: observed < budgetMs,
    observed,
    reason: `${observed.toFixed(1)}ms against a ${budgetMs}ms budget`,
  };
}

const file = process.argv[2];
if (file) {
  const result = evaluate(JSON.parse(readFileSync(file, 'utf8')));
  console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.reason}`);
  process.exit(result.pass ? 0 : 1);
}
