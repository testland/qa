// Checks that each plugin's description says only true things about the plugin.
//
// Plugin descriptions often enumerate components ("5 skills (...) and 2 agents
// (...)"). That enumeration rots whenever a component moves, and both copies of
// the description are user-facing: plugin.json is what the plugin manager shows
// at install time, and the marketplace.json entry is what CATALOG.md readers and
// testland.io show. Three checks, run on both copies:
//
//   counts  "N skills" / "N agents" (also "N reference skills", "1 A2 agent")
//           must sum to the SKILL.md / agent .md files on disk. A description
//           that states no count for a type is not checked for that type, so
//           prose-only descriptions and role bundles pass trivially.
//   names   kebab-case slugs listed in parentheses right after "skill(s)" or
//           "agent(s)" must be skills / agents of that plugin. Only the leading
//           word of each comma- or semicolon-separated item is read, and only
//           when it stands alone or is followed by " - ", "(", ":" or a connector
//           such as "with" / "covering" / "for", so prose after a slug
//           ("api-test-author, which picks ...") and hyphenated prose words
//           ("lock-time estimates") are ignored.
//   parity  the marketplace.json entry carries the same description as the
//           plugin's plugin.json, so the two copies cannot drift apart.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirNames, exists, fileNames, pluginNames } from './repo.ts';

export interface DescriptionProblem {
  file: string;
  reason: string;
}

// The lookbehind stops the "2" in a shape label like "A2 agent", or the "90" in
// "30-60-90 onboarding", being read as a count. Up to two words may sit
// between the number and the noun ("3 reference skills", "1 A2 agent").
const SKILLS_RE = /(?<![\w./-])(\d+)\s+(?:(?:A\d|[a-z][a-z-]*)\s+){0,2}skills?\b/gi;
const AGENTS_RE = /(?<![\w./-])(\d+)\s+(?:(?:A\d|[a-z][a-z-]*)\s+){0,2}agents?\b/gi;
const LIST_RE = /\b(skills?|agents?)\s*\(/gi;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
const LEADING_FILLER_RE = /^(?:(?:and|or|plus|the)\s+)+/i;
// What may follow a slug inside an item: nothing, a separator, or a connector word.
const AFTER_SLUG_RE =
  /^(?:\.?$|-\s|\(|:|(?:with|covering|carrying|for|which|that|plus|including|incl\.?|via|as|in|on|umbrella)\b)/;

const nums = (re: RegExp, s: string): number[] =>
  [...s.matchAll(re)].map((m) => Number.parseInt(m[1]!, 10));

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Splits `s` on commas and semicolons that sit outside nested parentheses. */
function topLevelItems(s: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if ((c === ',' || c === ';') && depth === 0) {
      items.push(s.slice(start, i));
      start = i + 1;
    }
  }
  items.push(s.slice(start));
  return items;
}

/** Slugs a description lists in parentheses after "skill(s)" / "agent(s)". */
export function listedSlugs(desc: string): { kind: 'skill' | 'agent'; slug: string }[] {
  const out: { kind: 'skill' | 'agent'; slug: string }[] = [];
  for (const m of desc.matchAll(LIST_RE)) {
    const kind = m[1]!.toLowerCase().startsWith('skill') ? 'skill' : 'agent';
    const open = m.index! + m[0].length - 1;
    let depth = 0;
    let close = open;
    for (; close < desc.length; close++) {
      if (desc[close] === '(') depth += 1;
      else if (desc[close] === ')' && --depth === 0) break;
    }
    for (const item of topLevelItems(desc.slice(open + 1, close))) {
      const text = item.trim().replace(LEADING_FILLER_RE, '').replaceAll('`', '');
      const m2 = /^([a-z0-9-]+)\s*([\s\S]*)$/.exec(text);
      if (!m2 || !SLUG_RE.test(m2[1]!)) continue;
      if (AFTER_SLUG_RE.test(m2[2]!)) out.push({ kind, slug: m2[1]! });
    }
  }
  return out;
}

function onDisk(root: string, pluginDir: string): { skills: Set<string>; agents: Set<string> } {
  const skills = dirNames(join(root, pluginDir, 'skills')).filter((s) =>
    exists(join(root, pluginDir, 'skills', s, 'SKILL.md')),
  );
  const agents = fileNames(join(root, pluginDir, 'agents'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3));
  return { skills: new Set(skills), agents: new Set(agents) };
}

function checkClaims(
  file: string,
  desc: string,
  disk: { skills: Set<string>; agents: Set<string> },
  problems: DescriptionProblem[],
): void {
  const skillNums = nums(SKILLS_RE, desc);
  const agentNums = nums(AGENTS_RE, desc);
  if (skillNums.length && sum(skillNums) !== disk.skills.size) {
    problems.push({
      file,
      reason:
        `description claims ${sum(skillNums)} skills ` +
        `(from [${skillNums.join(', ')}]) but ${disk.skills.size} SKILL.md on disk`,
    });
  }
  if (agentNums.length && sum(agentNums) !== disk.agents.size) {
    problems.push({
      file,
      reason:
        `description claims ${sum(agentNums)} agents ` +
        `(from [${agentNums.join(', ')}]) but ${disk.agents.size} agent .md on disk`,
    });
  }
  for (const { kind, slug } of listedSlugs(desc)) {
    const present = kind === 'skill' ? disk.skills.has(slug) : disk.agents.has(slug);
    if (!present) {
      problems.push({ file, reason: `description names ${kind} '${slug}', which this plugin does not ship` });
    }
  }
}

/** Every description problem across plugin.json files and marketplace.json entries. */
export function descriptionProblems(root: string): { checked: number; problems: DescriptionProblem[] } {
  const problems: DescriptionProblem[] = [];
  const byName = new Map<string, { dir: string; desc: string }>();
  let checked = 0;

  for (const plugin of pluginNames(root)) {
    const dir = `plugins/${plugin}`;
    const path = `${dir}/.claude-plugin/plugin.json`;
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(readFileSync(join(root, path), 'utf8')) as Record<string, unknown>;
    } catch {
      continue; // missing or malformed manifest: the JSON syntax check reports it
    }
    const desc = typeof json['description'] === 'string' ? (json['description'] as string) : '';
    byName.set(plugin, { dir, desc });
    checkClaims(path, desc, onDisk(root, dir), problems);
    checked += 1;
  }

  const mpPath = '.claude-plugin/marketplace.json';
  if (exists(join(root, mpPath))) {
    let entries: { name?: unknown; description?: unknown }[] = [];
    try {
      const mp = JSON.parse(readFileSync(join(root, mpPath), 'utf8')) as { plugins?: unknown };
      if (Array.isArray(mp.plugins)) entries = mp.plugins as typeof entries;
    } catch {
      // Malformed JSON is reported by the JSON syntax check; nothing to compare.
    }
    for (const e of entries) {
      if (typeof e.name !== 'string' || typeof e.description !== 'string') continue;
      const own = byName.get(e.name);
      if (!own) continue;
      const file = `${mpPath} (${e.name})`;
      checkClaims(file, e.description, onDisk(root, own.dir), problems);
      if (own.desc && e.description !== own.desc) {
        problems.push({
          file,
          reason: `description differs from plugins/${e.name}/.claude-plugin/plugin.json; keep the two identical`,
        });
      }
    }
  }

  return { checked, problems };
}
