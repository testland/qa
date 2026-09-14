#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export const FLOOR = 0.95;

export function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function passRate(run) {
  const rows = run.results;
  return rows.filter((r) => r.success).length / rows.length;
}

export function verdict(baselinePath, candidatePath, floor = FLOOR) {
  const baseline = passRate(load(baselinePath));
  const candidate = passRate(load(candidatePath));
  return { baseline, candidate, ok: candidate >= floor };
}

if (process.argv[1] && process.argv[1].endsWith('gate.mjs')) {
  const [, , base, cand] = process.argv;
  const v = verdict(base, cand);
  console.log(`baseline ${(v.baseline * 100).toFixed(1)}%  candidate ${(v.candidate * 100).toFixed(1)}%`);
  console.log(v.ok ? 'PASS' : 'REGRESSION: candidate is below the floor');
  process.exit(v.ok ? 0 : 1);
}
