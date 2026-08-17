#!/usr/bin/env tsx
// Compiles the committed Tessl-native scenarios into Anthropic's eval format.
//
// Source of truth is plugins/<p>/skills/<s>/evals/<scenario>/{task.md,criteria.json}.
// Nothing is generated for Tessl - `tessl skill publish` reads those files as they
// sit, so that target is identity rather than a round-trip that could drift.
//
// Emitted, both inside the skill directory because BOTH vendors require
// co-location (Tessl's CLI looks for evals/ beside the tile; Anthropic reads
// evals/evals.json inside the skill):
//
//   evals/evals.json                  Anthropic manifest for the whole skill
//   evals/<scenario>/files/<path>     fixtures as real files
//
// Fixtures go inside the scenario directory on purpose. Tessl discovers
// scenarios as SUBDIRECTORIES of evals/, so an evals/files/ sibling could be
// mistaken for a scenario with no task.md. A plain file (evals.json) at that
// level is not a directory and is skipped by the same scan.
//
// Lossy in one direction, by design: Anthropic assertions are binary, so
// max_score weights are dropped, and `context` (the predicted baseline failure)
// has no slot in their schema. The compiler reports both rather than hiding it.

import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { loadScenarios, type Scenario } from './lib/scenario.ts';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');

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
  for (const [skillDir, list] of [...bySkill].sort(([a], [b]) => a.localeCompare(b))) {
    const skill = list[0]!.skill;
    out.push({
      path: join(skillDir, 'evals', 'evals.json'),
      content: stringify(toAnthropic(skill, list)),
    });
    for (const s of list) {
      for (const f of s.fixtures) {
        out.push({
          path: join(skillDir, 'evals', s.scenario, 'files', ...f.path.split(/[\\/]/)),
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

  // Clear previously generated fixture dirs so a renamed or deleted fixture
  // cannot survive as an orphan that --check would never flag.
  for (const s of scenarios) {
    const files = join(s.dir, 'files');
    if (existsSync(files)) rmSync(files, { recursive: true, force: true });
  }

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
  console.log(`  anthropic: evals/evals.json + evals/<scenario>/files/**`);
  if (weighted) {
    console.log(`\nlossy toward anthropic (their assertions are binary):`);
    console.log(`  ${weighted} weighted criteria lost their max_score`);
    if (withContext) console.log(`  ${withContext} scenarios have a 'context' with no anthropic slot`);
  }
}

main();
