#!/usr/bin/env tsx
// Walks the marketplace and prints every component's classification.
// Port of scripts/inventory.py; output is byte-identical.
//
// `rating` and `d6` are read but no longer authored - the D1-D6 rubric moved to
// manual PR review, so both read 0 for every component. The distributions are
// kept so the output shape does not change while old snapshots are around.

import { agents, byCodepoint, skills } from './lib/repo.ts';
import { int, parseFrontmatter, str, type Frontmatter } from './lib/frontmatter.ts';

const ROOT = process.cwd();
const AS_JSON = process.argv.includes('--json');

interface Component {
  kind: 'skill' | 'agent';
  plugin: string;
  name: string;
  rating: number;
  d6: number;
  description: string;
  preloads?: string[];
}

const components: Component[] = [];
const byPlugin = new Map<string, Component[]>();

const record = (c: Component): void => {
  components.push(c);
  const list = byPlugin.get(c.plugin) ?? [];
  list.push(c);
  byPlugin.set(c.plugin, list);
};

for (const s of skills(ROOT)) {
  const fm: Frontmatter = parseFrontmatter(s.path);
  record({
    kind: 'skill',
    plugin: s.plugin,
    name: s.skill,
    rating: int(fm, 'rating'),
    d6: int(fm, 'd6'),
    description: str(fm, 'description'),
  });
}

for (const a of agents(ROOT)) {
  const fm: Frontmatter = parseFrontmatter(a.path);
  record({
    kind: 'agent',
    plugin: a.plugin,
    name: a.agent,
    rating: int(fm, 'rating'),
    d6: int(fm, 'd6'),
    description: str(fm, 'description'),
    preloads: Array.isArray(fm['skills']) ? (fm['skills'] as string[]) : [],
  });
}

if (AS_JSON) {
  console.log(JSON.stringify({ components }, null, 2));
  process.exit(0);
}

const tally = (pick: (c: Component) => number): Map<number, number> => {
  const m = new Map<number, number>();
  for (const c of components) m.set(pick(c), (m.get(pick(c)) ?? 0) + 1);
  return m;
};

console.log('=== Marketplace inventory ===');
console.log(`Total plugins: ${byPlugin.size}`);
console.log(`Total components: ${components.length}`);
console.log(`  Skills: ${components.filter((c) => c.kind === 'skill').length}`);
console.log(`  Agents: ${components.filter((c) => c.kind === 'agent').length}`);
console.log('');
console.log('=== Rating distribution ===');
const ratings = tally((c) => c.rating);
for (const r of [...ratings.keys()].sort((a, b) => a - b)) console.log(`  ${r}: ${ratings.get(r)}`);
console.log('');
console.log('=== d6 distribution ===');
const d6s = tally((c) => c.d6);
for (const d of [...d6s.keys()].sort((a, b) => a - b)) console.log(`  d6=${d}: ${d6s.get(d)}`);
console.log('');
console.log('=== Per-plugin counts ===');
for (const p of [...byPlugin.keys()].sort(byCodepoint)) {
  const list = byPlugin.get(p)!;
  const s = list.filter((c) => c.kind === 'skill').length;
  const a = list.filter((c) => c.kind === 'agent').length;
  const avg = list.reduce((n, c) => n + c.rating, 0) / list.length;
  console.log(`  ${p}: ${s + a} (${s} skills + ${a} agents) avg rating ${avg.toFixed(1)}`);
}
