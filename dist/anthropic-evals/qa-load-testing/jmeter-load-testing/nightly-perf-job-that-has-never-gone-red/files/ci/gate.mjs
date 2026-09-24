#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export const MAX_ERRORS = 10;

export function countErrors(jtl) {
  let errors = 0;
  for (const line of jtl.split('\n')) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    if (cols[6] === 'false') errors += 1;
  }
  return errors;
}

export function verdict(jtl) {
  const errors = countErrors(jtl);
  return { errors, ok: errors <= MAX_ERRORS };
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('gate.mjs');
if (invokedDirectly) {
  const { errors, ok } = verdict(readFileSync(process.argv[2], 'utf8'));
  console.log(`errors=${errors} max=${MAX_ERRORS}`);
  if (!ok) {
    console.log(`::error::${errors} failed samples exceeds the maximum of ${MAX_ERRORS}`);
    process.exit(1);
  }
}
