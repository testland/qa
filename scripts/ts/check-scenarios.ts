#!/usr/bin/env tsx
// Structural check for authored eval scenarios, scoped to one skill directory so
// it can run while other authors are still writing elsewhere.
//
// Verifies the things the compiler and the run harness silently depend on:
// the three required H2 sections, at least one parseable FILE block, criteria
// that parse and carry weights, and the conventions EVALS.md requires - a
// context naming the predicted baseline failure, and stated zero conditions.
//
// Usage: tsx scripts/ts/check-scenarios.ts plugins/<plugin>/skills/<skill>

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirNames, exists } from './lib/repo.ts';
import { parseTask } from './lib/scenario.ts';

const skillDir = process.argv[2];
if (!skillDir) {
  console.error('usage: check-scenarios.ts plugins/<plugin>/skills/<skill>');
  process.exit(2);
}

const evalsDir = join(skillDir, 'evals');
const scenarios = dirNames(evalsDir).filter((d) => exists(join(evalsDir, d, 'criteria.json')));

let bad = 0;
const problems: string[] = [];
const warnings: string[] = [];
const flag = (s: string, msg: string) => {
  problems.push(`  ${s}: ${msg}`);
  bad += 1;
};

for (const s of scenarios) {
  const dir = join(evalsDir, s);
  const taskPath = join(dir, 'task.md');
  if (!exists(taskPath)) {
    flag(s, 'no task.md');
    continue;
  }
  const raw = readFileSync(taskPath, 'utf8').replace(/\r\n/g, '\n');

  for (const h of ['Problem Description', 'Output Specification', 'Input Files']) {
    if (!new RegExp(`^##[ \\t]+${h}[ \\t]*$`, 'm').test(raw)) flag(s, `missing "## ${h}"`);
  }
  if (!/^# \S/m.test(raw)) flag(s, 'no H1 title');

  const { prompt, expectedOutput, fixtures } = parseTask(raw);
  if (fixtures.length === 0) flag(s, 'no FILE blocks parsed');
  if (!expectedOutput) flag(s, 'Output Specification section is empty');
  if (prompt.length < 200) flag(s, `prompt suspiciously short (${prompt.length} chars)`);
  for (const f of fixtures) {
    if (!f.content.trim()) flag(s, `fixture ${f.path} is empty`);
    if (/^[A-Za-z]:[\\/]/.test(f.path) || f.path.startsWith('/') || f.path.includes('..')) {
      flag(s, `fixture path escapes the run dir: ${f.path}`);
    }
  }

  let crit: { context?: string; type?: string; checklist?: { name: string; max_score: number; description: string }[] };
  try {
    crit = JSON.parse(readFileSync(join(dir, 'criteria.json'), 'utf8'));
  } catch (e) {
    flag(s, `criteria.json does not parse: ${(e as Error).message}`);
    continue;
  }
  const list = crit.checklist ?? [];
  if (crit.type !== 'weighted_checklist') flag(s, `type is "${crit.type}"`);
  if (!crit.context || crit.context.length < 80) flag(s, 'context missing or too thin to name a predicted failure');
  if (list.length < 5) flag(s, `only ${list.length} checklist items`);
  for (const c of list) {
    if (!c.name || !c.description) flag(s, 'checklist item missing name or description');
    if (!Number.isInteger(c.max_score) || c.max_score <= 0) flag(s, `bad max_score on "${c.name}"`);
  }
  // Advisory, not a gate. EVALS.md asks for zero/half conditions as an authoring
  // rule, not on every criterion - a deliverable-exists check has nothing useful
  // to say about scoring zero. Density below a third is worth seeing, though,
  // because it usually means the rubric is describing the ideal rather than the
  // failure it is trying to separate.
  const zeros = list.filter((c) => /scores? zero|score zero/i.test(c.description ?? '')).length;
  if (zeros < Math.max(2, Math.floor(list.length / 3))) {
    warnings.push(`  ${s}: only ${zeros}/${list.length} criteria state a zero condition`);
  }
  // Either one dominant criterion, or - for find-all-N audit scenarios - a pair
  // of heavy ones that jointly carry the comparison. Requiring a single >=20
  // would reject a sound audit rubric that spreads weight across its findings.
  const byWeight = [...list].map((c) => c.max_score).sort((a, b) => b - a);
  const [top = 0, second = 0] = byWeight;
  if (top < 20 && top + second < 30) {
    flag(s, `heaviest criteria are ${top}/${second} - nothing carries the comparison`);
  }
  // The prohibition may sit in the criterion name or its description, in any case.
  if (!list.some((c) => /must not/i.test(`${c.name ?? ''} ${c.description ?? ''}`))) {
    flag(s, 'no must-not criterion');
  }
}

console.log(`${skillDir}: ${scenarios.length} scenarios`);
if (warnings.length) console.log(warnings.join('\n'));
if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`FAIL - ${bad} problem(s)`);
  process.exit(1);
}
console.log('OK - all scenarios structurally sound');
