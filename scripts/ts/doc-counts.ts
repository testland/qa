#!/usr/bin/env tsx
// Rewrites the catalog counts that prose docs quote, so they cannot drift from
// the plugin tree. A count is marked inline in the markdown:
//
//   <!-- count:skills -->329<!-- /count --> skills
//
// and this script replaces the number between the markers. The comments do not
// render on GitHub. Run by `npm run catalog`; `--check` exits 1 instead of
// writing when a count is stale.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agents, read, skills } from './lib/repo.ts';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');

/** Docs that quote counts. Each must hold at least one marker. */
const FILES = ['CLAUDE.md', 'CORE.md', 'docs/ROADMAP.md', '.github/SECURITY.md'];

const MARKER = /<!-- count:([a-z-]+) -->(\d+)<!-- \/count -->/g;

function coreCounts(): { skills: number; agents: number } {
  const core = read(join(ROOT, 'CORE.md'));
  const skillsAt = core.indexOf('\n## Core skills');
  const agentsAt = core.indexOf('\n## Core agents');
  if (skillsAt === -1 || agentsAt === -1) {
    throw new Error('CORE.md needs "## Core skills" and "## Core agents" sections');
  }
  const next = core.indexOf('\n## ', agentsAt + 1);
  const skillNames = new Set(
    [...core.slice(skillsAt, agentsAt).matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]!),
  );
  const agentRows = core
    .slice(agentsAt, next === -1 ? undefined : next)
    .split('\n')
    .filter((l) => l.startsWith('| `'));
  return { skills: skillNames.size, agents: agentRows.length };
}

function catalogCounts(): Record<string, number> {
  const marketplace = JSON.parse(
    readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'),
  ) as { plugins?: { category?: string }[] };
  const entries = marketplace.plugins ?? [];
  const bundles = entries.filter((p) => p.category === 'role-bundles').length;
  const skillCount = skills(ROOT).length;
  const agentCount = agents(ROOT).length;
  const core = coreCounts();
  return {
    plugins: entries.length,
    bundles,
    'leaf-plugins': entries.length - bundles,
    skills: skillCount,
    agents: agentCount,
    components: skillCount + agentCount,
    'core-skills': core.skills,
    'core-agents': core.agents,
  };
}

function main(): void {
  const counts = catalogCounts();
  const stale: string[] = [];
  const problems: string[] = [];

  for (const file of FILES) {
    const path = join(ROOT, file);
    const before = read(path);
    let markers = 0;
    const after = before.replace(MARKER, (whole, key: string, value: string) => {
      markers++;
      const want = counts[key];
      if (want === undefined) {
        problems.push(`${file}: unknown count "${key}" (known: ${Object.keys(counts).join(', ')})`);
        return whole;
      }
      if (String(want) !== value) stale.push(`${file}: ${key} ${value} -> ${want}`);
      return `<!-- count:${key} -->${want}<!-- /count -->`;
    });
    if (markers === 0) problems.push(`${file}: no <!-- count:... --> markers`);
    if (!CHECK && after !== before) writeFileSync(path, after);
  }

  for (const p of problems) console.error(`error: ${p}`);
  if (problems.length) process.exit(1);

  if (CHECK) {
    if (stale.length) {
      for (const s of stale) console.error(`stale: ${s}`);
      console.error('run `npm run catalog` and commit the result.');
      process.exit(1);
    }
    console.log(`doc-counts: ${FILES.length} files current`);
    return;
  }
  for (const s of stale) console.log(`updated ${s}`);
  console.log(`doc-counts: ${FILES.length} files current`);
}

main();
