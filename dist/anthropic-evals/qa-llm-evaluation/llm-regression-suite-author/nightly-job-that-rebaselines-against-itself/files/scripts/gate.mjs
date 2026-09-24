#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export const MIN_RATIO = 0.97;

export function rate(path) {
  const r = JSON.parse(readFileSync(path, 'utf8'));
  return r.passed / r.total;
}

export function decide(baselineRate, candidateRate, minRatio = MIN_RATIO) {
  const ratio = baselineRate > 0 ? candidateRate / baselineRate : 0;
  return { baseline: baselineRate, candidate: candidateRate, ratio, ok: ratio >= minRatio };
}

export function gate(baselinePath, candidatePath, minRatio = MIN_RATIO) {
  return decide(rate(baselinePath), rate(candidatePath), minRatio);
}

if (process.argv[1] && process.argv[1].endsWith('gate.mjs')) {
  const [, , basePath, candPath] = process.argv;
  const g = gate(basePath, candPath);
  console.log(`baseline ${g.baseline.toFixed(3)}  tonight ${g.candidate.toFixed(3)}  ratio ${g.ratio.toFixed(4)}`);
  console.log(g.ok ? 'PASS' : `FAIL: retained only ${(g.ratio * 100).toFixed(1)}% of the baseline`);
  process.exit(g.ok ? 0 : 1);
}
