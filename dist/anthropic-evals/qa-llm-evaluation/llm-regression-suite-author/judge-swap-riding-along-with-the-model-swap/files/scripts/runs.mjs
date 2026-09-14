#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function rate(rows) {
  return rows.filter((r) => r.success).length / rows.length;
}

if (process.argv[1] && process.argv[1].endsWith('runs.mjs')) {
  for (const p of process.argv.slice(2)) {
    const run = load(p);
    console.log(`${p}  ${rate(run.results).toFixed(4)}  (${run.results.length} cases)`);
  }
}
