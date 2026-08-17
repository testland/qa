#!/usr/bin/env tsx
// Flags plugin.json descriptions whose claimed component counts disagree with disk.
//
// The marketplace convention enumerates components in each plugin's description
// ("5 skills (...) and 2 agents (...)"). That enumeration rots whenever a
// component moves, and plugin.json is what the plugin manager shows at install
// time. A description stating no count for a type is not checked for that type,
// so prose-only descriptions and role bundles pass trivially.
//
// Port of scripts/check-description-drift.py; output is byte-identical.

import { join } from 'node:path';
import { dirNames, exists, fileNames, manifests } from './lib/repo.ts';

const ROOT = process.cwd();

// The leading negative lookbehind stops the "2" in a shape label like "A2 agent"
// being read as a count; the optional "A\d " group lets a real count followed by
// a shape label ("1 A2 agent") still register as 1.
const SKILLS_RE = /(?<![A-Za-z0-9])(\d+)\s+skills?\b/gi;
const AGENTS_RE = /(?<![A-Za-z0-9])(\d+)\s+(?:A\d\s+)?agents?\b/gi;

const nums = (re: RegExp, s: string): number[] =>
  [...s.matchAll(re)].map((m) => Number.parseInt(m[1]!, 10));

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

function diskCounts(pluginDir: string): [number, number] {
  const skills = dirNames(join(ROOT, pluginDir, 'skills')).filter((s) =>
    exists(join(ROOT, pluginDir, 'skills', s, 'SKILL.md')),
  ).length;
  const agents = fileNames(join(ROOT, pluginDir, 'agents')).filter((f) => f.endsWith('.md')).length;
  return [skills, agents];
}

const problems: string[] = [];
let checked = 0;

for (const m of manifests(ROOT)) {
  const desc = typeof m.json['description'] === 'string' ? (m.json['description'] as string) : '';
  const [diskSkills, diskAgents] = diskCounts(m.dir);
  const skillNums = nums(SKILLS_RE, desc);
  const agentNums = nums(AGENTS_RE, desc);
  checked += 1;

  if (skillNums.length && sum(skillNums) !== diskSkills) {
    problems.push(
      `${m.dir}: description claims ${sum(skillNums)} skills ` +
        `(from [${skillNums.join(', ')}]) but ${diskSkills} SKILL.md on disk`,
    );
  }
  if (agentNums.length && sum(agentNums) !== diskAgents) {
    problems.push(
      `${m.dir}: description claims ${sum(agentNums)} agents ` +
        `(from [${agentNums.join(', ')}]) but ${diskAgents} agent .md on disk`,
    );
  }
}

console.log(`description-drift: scanned ${checked} plugin manifests`);
if (problems.length) {
  console.log(`description-drift: ${problems.length} mismatch(es):`);
  for (const p of problems) console.log(`  FAIL ${p}`);
  process.exit(1);
}
console.log('description-drift: all enumerated component counts match disk');
