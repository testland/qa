#!/usr/bin/env tsx
// Companion to .qa-eval/pilot/parity-dump.ps1. Emits the same path+hash rows so
// the two parsers can be diffed. Kept out of the npm scripts - it exists to
// prove the TS port, not as part of the build.

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { loadScenarios } from './lib/scenario.ts';

const hash = (s: string) => createHash('md5').update(s.replace(/\r\n/g, '\n'), 'utf8').digest('hex');

const rows: { id: string; path: string; hash: string }[] = [];
for (const s of loadScenarios(process.cwd())) {
  for (const f of s.fixtures) rows.push({ id: s.id, path: f.path.replace(/\\/g, '/'), hash: hash(f.content) });
  rows.push({ id: s.id, path: '<PROMPT>', hash: hash(s.prompt) });
}
rows.sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path));

writeFileSync(process.argv[2] ?? 'parity-typescript.json', JSON.stringify(rows, null, 2) + '\n');
console.log(`wrote ${rows.length} rows`);
