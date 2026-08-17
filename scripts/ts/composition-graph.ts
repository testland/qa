#!/usr/bin/env tsx
// Builds the agent -> skill preload graph and validates cross-plugin deps.
// Port of scripts/composition-graph.py; output is byte-identical.

import { agents, frontmatter, listField, read, skills } from './lib/repo.ts';

const ROOT = process.cwd();

const skillToPlugin = new Map<string, string>();
for (const s of skills(ROOT)) skillToPlugin.set(s.skill, s.plugin);

const issues: string[] = [];
const agentData: { plugin: string; agent: string; preloads: string[] }[] = [];

for (const a of agents(ROOT)) {
  const fm = frontmatter(read(a.path));
  if (fm === null) continue;
  const preloads = listField(fm, 'skills');
  agentData.push({ plugin: a.plugin, agent: a.agent, preloads });
  for (const s of preloads) {
    if (!skillToPlugin.has(s)) {
      issues.push(`MISSING: ${a.plugin}/${a.agent} preloads \`${s}\` which does not exist`);
    }
  }
}

console.log('=== Composition graph validation ===');
if (issues.length === 0) console.log('All preloaded skills resolve to a plugin.');
else for (const i of issues) console.log(i);

console.log('');
console.log('=== Cross-plugin preloads ===');
const cross: [string, string, string, string][] = [];
for (const { plugin, agent, preloads } of agentData) {
  for (const s of preloads) {
    const owner = skillToPlugin.get(s);
    if (owner && owner !== plugin) cross.push([plugin, agent, owner, s]);
  }
}
if (cross.length === 0) console.log('None.');
for (const [p, a, sp, s] of cross) console.log(`${p}/${a} -> ${sp}/${s}`);

console.log('');
console.log('=== Stats ===');
const withPreloads = agentData.filter((a) => a.preloads.length > 0).length;
console.log(`Total agents: ${agentData.length}`);
console.log(`Agents with \`skills:\` preloads: ${withPreloads}`);
console.log(`Agents without preloads: ${agentData.length - withPreloads}`);
console.log(`Total skills: ${skillToPlugin.size}`);
console.log(`Cross-plugin preload edges: ${cross.length}`);

process.exit(issues.length > 0 ? 1 : 0);
