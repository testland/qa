#!/usr/bin/env tsx
// Finds (and with --apply, fixes) broken relative .md links under plugins/.
// Port of scripts/fix_broken_links.py, which was labelled one-off.
//
// Skips fenced code blocks and template placeholders (<...>). For each broken
// link it resolves the intended target by matching the path tail against the
// real component tree, preferring an explicit plugin segment, then a uniquely
// owned skill, then a uniquely owned agent, then a plugin README. Ambiguous
// tails are left alone and reported.
//
// Usage: tsx scripts/ts/fix-broken-links.ts [--apply]

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { dirNames, exists, fileNames } from './lib/repo.ts';

const ROOT = process.cwd();
const PLUGINS = join(ROOT, 'plugins');
const APPLY = process.argv.includes('--apply');

const LINK_RE = /\]\(((?!https?:\/\/|mailto:|#)[^)\s#]+\.md)(#[^)]*)?\)/g;
const FENCE_RE = /^(```|~~~)/;

const pluginList = dirNames(PLUGINS).sort();
const skillOwner = new Map<string, string[]>();
const agentOwner = new Map<string, string[]>();

for (const p of pluginList) {
  for (const s of dirNames(join(PLUGINS, p, 'skills'))) {
    if (exists(join(PLUGINS, p, 'skills', s, 'SKILL.md'))) {
      skillOwner.set(s, [...(skillOwner.get(s) ?? []), p]);
    }
  }
  for (const f of fileNames(join(PLUGINS, p, 'agents'))) {
    if (f.endsWith('.md')) {
      const a = f.slice(0, -3);
      agentOwner.set(a, [...(agentOwner.get(a) ?? []), p]);
    }
  }
}

const soleOwner = (m: Map<string, string[]>, k: string): string | null => {
  const owners = m.get(k) ?? [];
  return owners.length === 1 ? owners[0]! : null;
};

/** Absolute path of the intended target, or null when it cannot be resolved. */
function resolveTarget(raw: string): string | null {
  const tail = raw.replace(/^(\.\.?\/)+/, '');

  const explicit = /^([a-z0-9-]+)\/(skills\/[^/]+\/(?:SKILL|references\/[^/]+)\.md|agents\/[^/]+\.md|README\.md)$/.exec(tail);
  if (explicit && pluginList.includes(explicit[1]!)) {
    const cand = join(PLUGINS, explicit[1]!, ...explicit[2]!.split('/'));
    if (exists(cand) && statSync(cand).isFile()) return cand;
  }

  const skillPath = /^skills\/([^/]+)\/SKILL\.md$/.exec(tail);
  if (skillPath) {
    const owner = soleOwner(skillOwner, skillPath[1]!);
    if (owner) return join(PLUGINS, owner, 'skills', skillPath[1]!, 'SKILL.md');
  }

  const agentPath = /^agents\/([^/]+)\.md$/.exec(tail);
  if (agentPath) {
    const owner = soleOwner(agentOwner, agentPath[1]!);
    if (owner) return join(PLUGINS, owner, 'agents', `${agentPath[1]!}.md`);
  }

  // <x>/SKILL.md - a sibling skill, or a plugin referenced as if it were one.
  const bareSkill = /^([^/]+)\/SKILL\.md$/.exec(tail);
  if (bareSkill) {
    const owner = soleOwner(skillOwner, bareSkill[1]!);
    if (owner) return join(PLUGINS, owner, 'skills', bareSkill[1]!, 'SKILL.md');
    if (pluginList.includes(bareSkill[1]!)) return join(PLUGINS, bareSkill[1]!, 'README.md');
  }

  const bareAgent = /^([^/]+)\.md$/.exec(tail);
  if (bareAgent) {
    const owner = soleOwner(agentOwner, bareAgent[1]!);
    if (owner) return join(PLUGINS, owner, 'agents', `${bareAgent[1]!}.md`);
  }

  return null;
}

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && e.name.endsWith('.md')) yield p;
  }
}

let fixed = 0;
const unresolved: [string, string][] = [];

for (const path of walk(PLUGINS)) {
  const dir = join(path, '..');
  const relFile = relative(ROOT, path).split('\\').join('/');
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  let inFence = false;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i]!.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    lines[i] = lines[i]!.replace(LINK_RE, (whole, raw: string, frag: string | undefined) => {
      if (raw.includes('<')) return whole; // template placeholder, intentional
      if (exists(resolve(dir, raw))) return whole;
      const target = resolveTarget(raw);
      if (target === null) {
        unresolved.push([relFile, raw]);
        return whole;
      }
      const newRel = relative(dir, target).split('\\').join('/');
      fixed += 1;
      changed = true;
      console.log(`  ${relFile}\n    ${raw}  ->  ${newRel}`);
      return `](${newRel}${frag ?? ''})`;
    });
  }

  if (changed && APPLY) writeFileSync(path, lines.join('\n'));
}

console.log(`\n${APPLY ? 'FIXED' : 'WOULD FIX'}: ${fixed}`);
if (unresolved.length) {
  console.log(`UNRESOLVED (${unresolved.length}):`);
  for (const [relFile, raw] of unresolved) console.log(`  ${relFile}: ${raw}`);
}
