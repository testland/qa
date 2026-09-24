import { readFileSync } from 'node:fs';

export const P95_BUDGET_MS = 400;

export function parseStats(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const cols = header.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
}

function aggregatedRow(csv) {
  return parseStats(csv).find((r) => r.Name === 'Aggregated');
}

export function workerP95(csv) {
  return Number(aggregatedRow(csv)['95%']);
}

export function workerCount(csv) {
  return Number(aggregatedRow(csv)['Request Count']);
}

// pool the generators' 95% columns, weighted by what each one contributed
export function runP95(csvs) {
  const total = csvs.reduce((a, c) => a + workerCount(c), 0);
  return csvs.reduce((a, c) => a + workerP95(c) * workerCount(c), 0) / total;
}

const files = process.argv.slice(2);
if (files.length) {
  const p95 = runP95(files.map((f) => readFileSync(f, 'utf8')));
  const pass = p95 < P95_BUDGET_MS;
  console.log(`run p95 ${p95.toFixed(1)}ms against a ${P95_BUDGET_MS}ms budget: ${pass ? 'PASS' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}
