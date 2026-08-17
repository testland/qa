#!/usr/bin/env tsx
// Runs the per-skill structural check across every skill that has an evals/
// directory, and prints a progress table. Safe to run while authors are still
// writing: a skill mid-write shows a low count rather than failing the run.

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { dirNames, exists, pluginNames } from './lib/repo.ts';

const ROOT = process.cwd();
const TARGET = Number(process.env['EVAL_TARGET'] ?? 10);

interface Row {
  skill: string;
  dir: string;
  count: number;
  ok: boolean;
  detail: string;
}

const rows: Row[] = [];
for (const plugin of pluginNames(ROOT)) {
  for (const skill of dirNames(join(ROOT, 'plugins', plugin, 'skills'))) {
    const skillDir = `plugins/${plugin}/skills/${skill}`;
    const evalsDir = join(ROOT, skillDir, 'evals');
    if (!exists(evalsDir)) continue;
    const count = dirNames(evalsDir).filter((d) => exists(join(evalsDir, d, 'criteria.json'))).length;
    const r = spawnSync('npx', ['tsx', 'scripts/ts/check-scenarios.ts', skillDir], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    const out = `${r.stdout ?? ''}`.trim().split('\n').slice(1).join(' | ');
    rows.push({ skill, dir: skillDir, count, ok: r.status === 0, detail: out });
  }
}

rows.sort((a, b) => a.count - b.count || a.skill.localeCompare(b.skill));
console.log(`${'skill'.padEnd(34)}${'n'.padStart(4)}  status`);
for (const r of rows) {
  const mark = r.ok ? 'OK' : 'PROBLEM';
  console.log(`${r.skill.slice(0, 33).padEnd(34)}${String(r.count).padStart(4)}  ${mark}`);
  if (!r.ok) console.log(`    ${r.detail.slice(0, 300)}`);
}

const total = rows.reduce((n, r) => n + r.count, 0);
const atTarget = rows.filter((r) => r.count >= TARGET).length;
const problems = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length} skills with evals · ${total} scenarios · ${atTarget} at >=${TARGET} · ${problems} with problems`);
process.exit(problems ? 1 : 0);
