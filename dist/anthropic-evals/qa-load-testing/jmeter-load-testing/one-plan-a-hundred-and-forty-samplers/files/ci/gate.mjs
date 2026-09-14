#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export function thresholdFor(sampler, thresholds) {
  const per = thresholds.response_time.per_sampler_p95_ms;
  return sampler in per ? per[sampler] : thresholds.response_time.default_p95_ms;
}

// statistics.json reports pct1/pct2/pct3 as the 90th, 95th and 99th percentiles.
export function breaches(statistics, thresholds) {
  const found = [];
  for (const [sampler, s] of Object.entries(statistics)) {
    if (sampler === 'Total') continue;
    const limit = thresholdFor(sampler, thresholds);
    if (s.pct2ResTime > limit) found.push({ sampler, p95: s.pct2ResTime, limit });
    if (s.errorCount > thresholds.error_budget) {
      found.push({ sampler, errors: s.errorCount, budget: thresholds.error_budget });
    }
  }
  return found;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('gate.mjs');
if (invokedDirectly) {
  const statistics = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const thresholds = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const found = breaches(statistics, thresholds);
  for (const b of found) console.log(`::error::${JSON.stringify(b)}`);
  console.log(`breaches=${found.length}`);
  if (found.length) process.exit(1);
}
