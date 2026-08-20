#!/usr/bin/env tsx
// Compiles the committed Tessl-native scenarios into Anthropic's eval format.
//
// Source of truth is plugins/<p>/skills/<s>/evals/<scenario>/{task.md,criteria.json}.
// Nothing is generated for Tessl - `tessl skill publish` reads those files as they
// sit, so that target is identity rather than a round-trip that could drift.
//
// Emitted under dist/, at the repo root:
//
//   dist/anthropic-evals/<plugin>/<skill>/evals.json          Anthropic manifest
//   dist/anthropic-evals/<plugin>/<skill>/<scenario>/files/**  fixtures as real files
//
// Deliberately NOT inside the skill. A marketplace plugin's source is
// ./plugins/<name>, so the whole directory is git-cloned onto every user's disk
// at install. Extracted fixtures look exactly like a runnable project
// (package.json, src/, tests/), and a weak agent pointed at the plugin will edit
// them instead of the user's code - observed in 6/170 haiku runs, which also
// corrupted this repo. The fixtures stay inline in task.md, where they are inert
// text, and the extracted copies live outside anything that ships.
//
// Anthropic's own layout wants evals.json beside the skill; a consumer who needs
// that copies the built bundle into place. Tessl is unaffected either way - it
// reads task.md + criteria.json as committed.
//
// Lossy in one direction, by design: Anthropic assertions are binary, so
// max_score weights are dropped, and `context` (the predicted baseline failure)
// has no slot in their schema. The compiler reports both rather than hiding it.

import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { loadScenarios, type Scenario } from './lib/scenario.ts';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const OUT_DIR = join('dist', 'anthropic-evals');

interface AnthropicEval {
  id: number;
  prompt: string;
  expected_output: string;
  files?: string[];
  assertions: string[];
}

interface AnthropicManifest {
  skill_name: string;
  evals: AnthropicEval[];
}

/** Stable formatting so --check compares content, not whitespace. */
const stringify = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

function toAnthropic(skill: string, scenarios: Scenario[]): AnthropicManifest {
  return {
    skill_name: skill,
    evals: scenarios.map((s, i) => {
      const files = s.fixtures.map((f) =>
        posix.join('evals', s.scenario, 'files', f.path.split(/[\\/]/).join('/')),
      );
      return {
        id: i + 1,
        prompt: s.prompt,
        expected_output: s.expectedOutput,
        ...(files.length ? { files } : {}),
        // Descriptions carry the zero/half conditions, which is exactly the
        // verifiable part; the criterion name alone would not be checkable.
        assertions: s.criteria.checklist.map((c) => c.description),
      };
    }),
  };
}

interface Emission {
  path: string;
  content: string;
}

function emissions(scenarios: Scenario[]): Emission[] {
  const bySkill = new Map<string, Scenario[]>();
  for (const s of scenarios) {
    const key = join('plugins', s.plugin, 'skills', s.skill);
    (bySkill.get(key) ?? bySkill.set(key, []).get(key)!).push(s);
  }

  const out: Emission[] = [];
  for (const [, list] of [...bySkill].sort(([a], [b]) => a.localeCompare(b))) {
    const skill = list[0]!.skill;
    const dest = join(OUT_DIR, list[0]!.plugin, skill);
    out.push({
      path: join(dest, 'evals.json'),
      content: stringify(toAnthropic(skill, list)),
    });
    for (const s of list) {
      for (const f of s.fixtures) {
        out.push({
          path: join(dest, s.scenario, 'files', ...f.path.split(/[\\/]/)),
          content: f.content,
        });
      }
    }
  }
  return out;
}

function main(): void {
  const scenarios = loadScenarios(ROOT);
  if (scenarios.length === 0) {
    console.error('no eval scenarios found under plugins/*/skills/*/evals/*');
    process.exit(1);
  }

  const planned = emissions(scenarios);
  const skills = new Set(scenarios.map((s) => `${s.plugin}/${s.skill}`));

  if (CHECK) {
    const drift: string[] = [];
    for (const e of planned) {
      const abs = join(ROOT, e.path);
      if (!existsSync(abs)) drift.push(`missing:  ${e.path}`);
      // Compare normalised: .gitattributes pins these to LF, but a checkout with
      // a stale index can still hand us CRLF, and that is not real drift.
      else if (readFileSync(abs, 'utf8').replace(/\r\n/g, '\n') !== e.content) {
        drift.push(`stale:    ${e.path}`);
      }
    }
    if (drift.length) {
      console.error(`eval drift - ${drift.length} file(s) out of sync with the scenarios:\n`);
      for (const d of drift.slice(0, 40)) console.error(`  ${d}`);
      if (drift.length > 40) console.error(`  ... and ${drift.length - 40} more`);
      console.error('\nrun `npm run evals:build` and commit the result.');
      process.exit(1);
    }
    console.log(`evals in sync - ${planned.length} generated file(s) across ${skills.size} skill(s)`);
    return;
  }

  // Clear the whole output tree so a renamed or deleted fixture cannot survive
  // as an orphan that --check would never flag.
  const outRoot = join(ROOT, OUT_DIR);
  if (existsSync(outRoot)) rmSync(outRoot, { recursive: true, force: true });

  for (const e of planned) {
    const abs = join(ROOT, e.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, e.content);
  }

  const weighted = scenarios.reduce(
    (n, s) => n + s.criteria.checklist.filter((c) => c.max_score !== 1).length,
    0,
  );
  const withContext = scenarios.filter((s) => s.criteria.context).length;

  console.log(`wrote ${planned.length} file(s) for ${skills.size} skill(s), ${scenarios.length} scenarios`);
  console.log(`  tessl:     unchanged - task.md + criteria.json are consumed as committed`);
  console.log(`  anthropic: ${OUT_DIR}/<plugin>/<skill>/** (outside plugins/, so it never ships)`);
  if (weighted) {
    console.log(`\nlossy toward anthropic (their assertions are binary):`);
    console.log(`  ${weighted} weighted criteria lost their max_score`);
    if (withContext) console.log(`  ${withContext} scenarios have a 'context' with no anthropic slot`);
  }
}

main();
