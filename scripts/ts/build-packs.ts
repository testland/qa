#!/usr/bin/env tsx
// Builds the directory packs from packs/packs.json: one Claude plugin per pack,
// plus a root marketplace.json and README, written to build/packs/ (or --out).
// The release workflow pushes that folder to testland/qa-skills; nobody edits
// the packs repo by hand.
//
// Each pack copies its source plugins' skill folders (without evals/ and
// .tessl-plugin/) and agents/*.md. Relative links are rewritten for the new
// layout: a target inside the same pack keeps a relative path, a target in
// another pack or outside the copied files points at its testland.io page, and
// anything outside plugins/ points at the file on GitHub.
//
// Pack versions live in packs/packs.lock.json with a hash of each pack's files.
// A pack's version moves only when its files change: minor when a skill or
// agent is added or removed, patch otherwise.
//
//   npm run packs           build, then update packs/packs.lock.json
//   npm run packs:check     build to a temp dir; exit 1 if the map or the lock is stale

import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFrontmatter, str } from './lib/frontmatter.ts';
import { byCodepoint, dirNames, exists, fileNames, slash } from './lib/repo.ts';

const ROOT = process.cwd();
const MAP_PATH = join(ROOT, 'packs', 'packs.json');
const LOCK_PATH = join(ROOT, 'packs', 'packs.lock.json');
const ICON_PATH = join(ROOT, 'packs', 'icon.png'); // the directory listing icon, fixed at first submission
const SITE = 'https://testland.io';
const MAX_PACK_FILES = 512;

export interface PackDef {
  name: string;
  displayName: string;
  description: string;
  keywords: string[];
  examplePrompts: string[];
  plugins: string[];
}

export interface PackMap {
  repository: string;
  sourceRepository: string;
  homepage: string;
  packs: PackDef[];
  recipes: { role: string; packs: string[] }[];
}

export interface LockEntry {
  version: string;
  hash: string;
  skills: string[];
  agents: string[];
}

type Lock = Record<string, LockEntry>;

interface PackFile {
  src: string; // repo-relative source path
  dest: string; // pack-relative destination path
}

interface BuiltPack {
  def: PackDef;
  files: Map<string, string>; // dest -> content
  skills: { name: string; plugin: string; description: string }[];
  agents: { name: string; plugin: string; description: string }[];
}

// ---------------------------------------------------------------- inputs

function walk(dir: string, rel = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(dir, r));
    else if (e.isFile()) out.push(r);
  }
  return out;
}

const SKIP_DIRS = new Set(['evals', '.tessl-plugin']);

/** Plugins that own at least one skill or agent: the ones a pack must place. */
export function componentPlugins(root: string): string[] {
  return dirNames(join(root, 'plugins'))
    .filter((p) => {
      const skills = dirNames(join(root, 'plugins', p, 'skills')).some((s) => exists(join(root, 'plugins', p, 'skills', s, 'SKILL.md')));
      const agents = fileNames(join(root, 'plugins', p, 'agents')).some((f) => f.endsWith('.md'));
      return skills || agents;
    })
    .sort(byCodepoint);
}

/** Map problems: every component plugin in exactly one pack, no unknown plugins, valid recipes. */
export function checkMap(map: PackMap, plugins: string[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  const packNames = new Set<string>();
  for (const p of map.packs) {
    if (packNames.has(p.name)) problems.push(`pack ${p.name} is defined twice`);
    packNames.add(p.name);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.name)) problems.push(`pack name ${p.name} is not kebab-case`);
    if (p.examplePrompts.length !== 3) problems.push(`pack ${p.name} needs exactly 3 example prompts`);
    for (const plugin of p.plugins) {
      const prev = seen.get(plugin);
      if (prev) problems.push(`plugin ${plugin} is in both ${prev} and ${p.name}`);
      seen.set(plugin, p.name);
      if (!plugins.includes(plugin)) problems.push(`pack ${p.name} lists ${plugin}, which owns no skills or agents (or does not exist)`);
    }
  }
  for (const plugin of plugins) if (!seen.has(plugin)) problems.push(`plugin ${plugin} is in no pack; add it to packs/packs.json`);
  for (const r of map.recipes) for (const p of r.packs) if (!packNames.has(p)) problems.push(`recipe ${r.role} names unknown pack ${p}`);
  return problems;
}

function collect(root: string, def: PackDef): { files: PackFile[]; problems: string[]; skills: BuiltPack['skills']; agents: BuiltPack['agents'] } {
  const files: PackFile[] = [];
  const problems: string[] = [];
  const skills: BuiltPack['skills'] = [];
  const agents: BuiltPack['agents'] = [];
  const owner = new Map<string, string>();
  for (const plugin of def.plugins) {
    const pdir = join(root, 'plugins', plugin);
    for (const skill of dirNames(join(pdir, 'skills')).sort(byCodepoint)) {
      const sdir = join(pdir, 'skills', skill);
      if (!exists(join(sdir, 'SKILL.md'))) continue;
      const prev = owner.get(`skill:${skill}`);
      if (prev) problems.push(`${def.name}: skill ${skill} comes from both ${prev} and ${plugin}`);
      owner.set(`skill:${skill}`, plugin);
      skills.push({ name: skill, plugin, description: str(parseFrontmatter(join(sdir, 'SKILL.md')), 'description') });
      for (const rel of walk(sdir)) {
        if (SKIP_DIRS.has(rel.split('/')[0]!)) continue;
        files.push({ src: `plugins/${plugin}/skills/${skill}/${rel}`, dest: `skills/${skill}/${rel}` });
      }
    }
    for (const f of fileNames(join(pdir, 'agents')).filter((x) => x.endsWith('.md')).sort(byCodepoint)) {
      const agent = f.slice(0, -3);
      const prev = owner.get(`agent:${agent}`);
      if (prev) problems.push(`${def.name}: agent ${agent} comes from both ${prev} and ${plugin}`);
      owner.set(`agent:${agent}`, plugin);
      agents.push({ name: agent, plugin, description: str(parseFrontmatter(join(pdir, 'agents', f)), 'description') });
      files.push({ src: `plugins/${plugin}/agents/${f}`, dest: `agents/${f}` });
    }
  }
  return { files, problems, skills, agents };
}

// ---------------------------------------------------------------- links

/** The testland.io page for a repo path under plugins/, or null. */
export function sitePage(repoPath: string): string | null {
  const m = /^plugins\/([^/]+)(?:\/(skills|agents)\/([^/]+))?/.exec(repoPath);
  if (!m) return null;
  const [, plugin, kind, name] = m;
  if (kind === 'skills' && name) return `${SITE}/plugins/${plugin}/skills/${name}`;
  if (kind === 'agents' && name) return `${SITE}/plugins/${plugin}/agents/${name.replace(/\.md$/, '')}`;
  return `${SITE}/plugins/${plugin}`;
}

/** Rewrites one relative link target found in `src` (copied to `dest` in `pack`). */
export function rewriteTarget(
  target: string,
  src: string,
  dest: string,
  pack: string,
  where: Map<string, { pack: string; dest: string }>,
  sourceRepo: string,
  fileExists: (repoPath: string) => boolean,
): string {
  if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return target;
  const cut = target.search(/[#?]/);
  const path = cut === -1 ? target : target.slice(0, cut);
  const suffix = cut === -1 ? '' : target.slice(cut);
  if (!path) return target;
  const resolved = posix.normalize(posix.join(posix.dirname(src), path)).replace(/\/$/, '');
  if (resolved.startsWith('..')) return target;
  const hit = where.get(resolved);
  if (hit && hit.pack === pack) {
    const rel = posix.relative(posix.dirname(dest), hit.dest) || posix.basename(hit.dest);
    return rel + suffix;
  }
  if (resolved.startsWith('plugins/')) {
    const page = sitePage(resolved);
    if (page && (hit || fileExists(resolved))) return page;
    return target;
  }
  return fileExists(resolved) ? `${sourceRepo}/blob/main/${resolved}${suffix}` : target;
}

/** Applies rewriteTarget to inline links and reference definitions outside code fences. */
export function rewriteLinks(text: string, rewrite: (target: string) => string): string {
  let fence: string | null = null;
  return text
    .split('\n')
    .map((line) => {
      const f = /^\s*(```|~~~)/.exec(line);
      if (f) {
        if (fence === null) fence = f[1]!;
        else if (f[1] === fence) fence = null;
        return line;
      }
      if (fence !== null) return line;
      line = line.replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/, (_m, pre: string, t: string) => pre + rewrite(t));
      return line.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (_m, t: string, title: string | undefined) => `](${rewrite(t)}${title ?? ''})`);
    })
    .join('\n');
}

// ---------------------------------------------------------------- output

const firstSentence = (s: string, max = 160): string => {
  const one = s.replace(/\s+/g, ' ').trim();
  const cut = one.search(/\.(\s|$)/);
  const sentence = cut === -1 ? one : one.slice(0, cut + 1);
  return sentence.length <= max ? sentence : `${sentence.slice(0, max - 1).trimEnd()}…`;
};

const cell = (s: string) => s.replace(/\|/g, '\\|');

function packReadme(map: PackMap, built: BuiltPack): string {
  const { def } = built;
  const recipes = map.recipes.filter((r) => r.packs.includes(def.name));
  const lines = [
    `# ${def.displayName}`,
    '',
    def.description,
    '',
    `${built.skills.length} skills and ${built.agents.length} agents, part of [Testland](${map.homepage}).`,
    '',
    '## Install',
    '',
    'Claude Code:',
    '',
    '```text',
    `/plugin marketplace add ${map.repository.replace('https://github.com/', '')}`,
    `/plugin install ${def.name}@testland-qa-skills`,
    '```',
    '',
    `Claude apps: add the marketplace \`${map.repository.replace('https://github.com/', '')}\` under Customize > Plugins, then install ${def.displayName}.`,
    '',
    '## Try it',
    '',
    ...def.examplePrompts.map((p) => `- "${p}"`),
    '',
  ];
  if (recipes.length) {
    lines.push('## Role recipes that use this pack', '', '| Role | Packs |', '| --- | --- |');
    for (const r of recipes) lines.push(`| ${r.role} | ${r.packs.join(' + ')} |`);
    lines.push('');
  }
  lines.push('## Skills', '', '| Skill | What it does |', '| --- | --- |');
  for (const s of built.skills) lines.push(`| [${s.name}](skills/${s.name}/SKILL.md) | ${cell(firstSentence(s.description))} |`);
  lines.push('');
  if (built.agents.length) {
    lines.push('## Agents', '', '| Agent | What it does |', '| --- | --- |');
    for (const a of built.agents) lines.push(`| [${a.name}](agents/${a.name}.md) | ${cell(firstSentence(a.description))} |`);
    lines.push('');
  }
  lines.push(
    '## Data',
    '',
    'The pack is instructions only: Markdown skills and agents with example code. Installing it runs nothing and sends nothing anywhere; commands in the skills run only when you or Claude run them in your project.',
    '',
    '## Source',
    '',
    `Generated from [${map.sourceRepository.replace('https://github.com/', '')}](${map.sourceRepository}) (plugins: ${def.plugins.join(', ')}). Report issues and send changes there. MIT licensed.`,
    '',
  );
  return lines.join('\n');
}

function rootReadme(map: PackMap, built: BuiltPack[]): string {
  const src = map.sourceRepository.replace('https://github.com/', '');
  const lines = [
    '# Testland QA skills',
    '',
    `Skills and agents for software testing and quality engineering, packaged as ${built.length} Claude plugins. Each skill is in exactly one pack, so installing several packs never loads a skill twice.`,
    '',
    `This repository is generated from [${src}](${map.sourceRepository}) on every release. Please star, open issues and send pull requests there; changes made here are overwritten.`,
    '',
    '## Install',
    '',
    '```text',
    `/plugin marketplace add ${map.repository.replace('https://github.com/', '')}`,
    '/plugin install testland-essentials@testland-qa-skills',
    '```',
    '',
    '## Packs',
    '',
    '| Pack | Skills | Agents | What it covers |',
    '| --- | --- | --- | --- |',
  ];
  for (const b of built) lines.push(`| [${b.def.displayName}](${b.def.name}/) | ${b.skills.length} | ${b.agents.length} | ${cell(b.def.description)} |`);
  lines.push('', '## Role recipes', '', '| Role | Packs |', '| --- | --- |');
  for (const r of map.recipes) lines.push(`| ${r.role} | ${r.packs.join(' + ')} |`);
  lines.push('', `More at [testland.io](${map.homepage}). MIT licensed.`, '');
  return lines.join('\n');
}

function marketplace(map: PackMap, built: BuiltPack[], versions: Map<string, string>): string {
  return `${JSON.stringify(
    {
      name: 'testland-qa-skills',
      owner: { name: 'Testland', url: `${map.homepage}/` },
      metadata: { description: 'Software testing and QA skills for Claude, in non-overlapping packs. Generated from testland/qa.' },
      plugins: built.map((b) => ({
        name: b.def.name,
        source: `./${b.def.name}`,
        description: b.def.description,
        version: versions.get(b.def.name),
      })),
    },
    null,
    2,
  )}\n`;
}

function manifest(map: PackMap, def: PackDef, version: string): string {
  return `${JSON.stringify(
    {
      name: def.name,
      displayName: def.displayName,
      version,
      description: def.description,
      author: { name: 'Testland', url: `${map.homepage}/` },
      homepage: map.homepage,
      repository: map.repository,
      license: 'MIT',
      keywords: def.keywords,
    },
    null,
    2,
  )}\n`;
}

// ---------------------------------------------------------------- versions

export function hashFiles(files: Map<string, string>): string {
  const h = createHash('sha256');
  for (const k of [...files.keys()].sort(byCodepoint)) h.update(`${k}\0${files.get(k)}\0`);
  return h.digest('hex');
}

export function nextVersion(prev: LockEntry | undefined, hash: string, skills: string[], agents: string[]): string {
  if (!prev) return '1.0.0';
  if (prev.hash === hash) return prev.version;
  const [maj, min, pat] = prev.version.split('.').map(Number) as [number, number, number];
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  return same(prev.skills, skills) && same(prev.agents, agents) ? `${maj}.${min}.${pat + 1}` : `${maj}.${min + 1}.0`;
}

// ---------------------------------------------------------------- main

function main(): void {
  const check = process.argv.includes('--check');
  const outIdx = process.argv.indexOf('--out');
  const out = check ? mkdtempSync(join(tmpdir(), 'packs-')) : join(ROOT, outIdx === -1 ? 'build/packs' : process.argv[outIdx + 1]!);

  const map = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as PackMap;
  const lock: Lock = exists(LOCK_PATH) ? (JSON.parse(readFileSync(LOCK_PATH, 'utf8')) as Lock) : {};
  const problems = checkMap(map, componentPlugins(ROOT));

  const collected = map.packs.map((def) => ({ def, ...collect(ROOT, def) }));
  const where = new Map<string, { pack: string; dest: string }>();
  for (const c of collected) {
    problems.push(...c.problems);
    for (const f of c.files) where.set(f.src, { pack: c.def.name, dest: f.dest });
    // A skill folder or agents/ directory link resolves to the folder itself.
    for (const s of c.skills) where.set(`plugins/${s.plugin}/skills/${s.name}`, { pack: c.def.name, dest: `skills/${s.name}` });
  }
  const fileExists = (p: string) => exists(join(ROOT, p));

  const built: BuiltPack[] = collected.map((c) => {
    const files = new Map<string, string>();
    for (const f of c.files) {
      const raw = readFileSync(join(ROOT, f.src));
      if (f.src.endsWith('.md')) {
        const text = rewriteLinks(raw.toString('utf8'), (t) => rewriteTarget(t, f.src, f.dest, c.def.name, where, map.sourceRepository, fileExists));
        files.set(f.dest, text);
      } else {
        files.set(f.dest, raw.toString('latin1'));
      }
    }
    if (files.size + 2 > MAX_PACK_FILES) problems.push(`${c.def.name}: ${files.size + 2} files, over the ${MAX_PACK_FILES} limit`);
    return { def: c.def, files, skills: c.skills, agents: c.agents };
  });

  const versions = new Map<string, string>();
  const newLock: Lock = {};
  for (const b of built) {
    b.files.set('README.md', packReadme(map, b));
    b.files.set('.claude-plugin/icon.png', readFileSync(ICON_PATH).toString('latin1'));
    const hash = hashFiles(b.files);
    const skills = b.skills.map((s) => s.name);
    const agents = b.agents.map((a) => a.name);
    const version = nextVersion(lock[b.def.name], hash, skills, agents);
    versions.set(b.def.name, version);
    newLock[b.def.name] = { version, hash, skills, agents };
  }

  if (problems.length) {
    console.error(`packs: ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  const lockText = `${JSON.stringify(newLock, null, 2)}\n`;
  if (check) {
    rmSync(out, { recursive: true, force: true });
    const current = exists(LOCK_PATH) ? readFileSync(LOCK_PATH, 'utf8') : '';
    if (current !== lockText) {
      const stale = built.filter((b) => lock[b.def.name]?.hash !== newLock[b.def.name]!.hash).map((b) => b.def.name);
      console.error(`packs: packs/packs.lock.json is out of date (${stale.join(', ') || 'pack list changed'}). Run \`make packs\` and commit the lock file.`);
      process.exit(1);
    }
    console.log(`packs: ${built.length} packs, lock up to date`);
    return;
  }

  rmSync(out, { recursive: true, force: true });
  const write = (rel: string, content: string, binary = false) => {
    const p = join(out, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, binary ? Buffer.from(content, 'latin1') : content);
  };
  for (const b of built) {
    for (const [dest, content] of b.files) write(`${b.def.name}/${dest}`, content, !dest.endsWith('.md'));
    write(`${b.def.name}/.claude-plugin/plugin.json`, manifest(map, b.def, versions.get(b.def.name)!));
  }
  write('.claude-plugin/marketplace.json', marketplace(map, built, versions));
  write('README.md', rootReadme(map, built));
  write('LICENSE', readFileSync(join(ROOT, 'LICENSE'), 'utf8'));
  writeFileSync(LOCK_PATH, lockText);

  for (const b of built) {
    const changed = lock[b.def.name]?.version !== versions.get(b.def.name);
    console.log(`  ${b.def.name.padEnd(26)} ${versions.get(b.def.name)!.padEnd(8)} ${String(b.skills.length).padStart(3)} skills ${String(b.agents.length).padStart(2)} agents ${String(b.files.size + 1).padStart(4)} files${changed ? '  (new version)' : ''}`);
  }
  console.log(`packs: wrote ${slash(out.replace(`${ROOT}/`, ''))} and packs/packs.lock.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
