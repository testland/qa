import { readFileSync } from 'node:fs';

export function summarise(runResults) {
  const results = runResults.results ?? [];
  const tests = results.filter((r) => r.unique_id.startsWith('test.'));
  const failing = tests.filter((r) => r.status === 'fail');
  return {
    total: tests.length,
    failing: failing.length,
    lines: failing.map((r) => `FAIL: ${r.unique_id} - ${r.failures} failing rows`),
  };
}

export function render(summary) {
  if (summary.failing === 0) {
    return `dbt nightly: ${summary.total} tests, 0 failing tests`;
  }
  return [
    `dbt nightly: ${summary.total} tests, ${summary.failing} failing tests`,
    ...summary.lines,
  ].join('\n');
}

const direct = process.argv[1] && process.argv[1].endsWith('dbt-summary.mjs');
if (direct) {
  const path = process.argv[2] ?? 'target/run_results.json';
  console.log(render(summarise(JSON.parse(readFileSync(path, 'utf8')))));
}
