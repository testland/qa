#!/usr/bin/env tsx
// Structural lint for plugin components.
// Port of scripts/validate.py. The FAIL/WARN lines are byte-identical to the
// Python; only the two summary lines dropped their "validate.sh:" prefix, which
// named a dispatcher this migration deleted.
//
// Structural only. Persona-shaped scopes are NOT rejected here - reviewer
// judgment on D3/D4 catches those (docs/CONTRIBUTING.md).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { byCodepoint, dirNames, exists, fileNames, pluginNames } from './lib/repo.ts';

const ROOT = process.argv[2] ?? '.';

const KEBAB_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const RESERVED_RE = /(anthropic|claude)/;
const PLACEHOLDER_RE = /DESCRIPTION_PLACEHOLDER|CONTENT_PLACEHOLDER/;
const TODO_RE = /(^|\s)(TODO|FIXME)(\s|$)/m;

// Advisory prose-style checks (docs/PLUGIN_AUTHORING.md "Prose style").
const FENCE_RE = /^\s*(```|~~~)/;
const INLINE_CODE_RE = /`[^`\n]+`/g;
const EM_EN_DASH_RE = /[–—]/g;
// A whole guidance sentence wrapped in backticks: ALLCAPS_TOKEN <sep> words.
const SENTENCE_IN_CODE_RE = /^[A-Z][A-Z0-9_]{3,}\s*[-–—:]\s+\w/;

let exitCode = 0;
let warnCount = 0;

const fail = (file: string, reason: string): void => {
  console.log(`FAIL (${file}): ${reason}`);
  exitCode = 1;
};

const warn = (file: string, reason: string): void => {
  console.log(`WARN (${file}): ${reason}`);
  warnCount += 1;
};

// Python reads in text mode, which applies universal-newline translation, so its
// lines never carry a trailing \r. JS `.` does not match \r, so without this every
// `^key:\s*(.*)$` probe fails on a CRLF checkout and every file looks nameless.
const readText = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

/** (frontmatter, body); frontmatter is empty when absent. */
function extractFrontmatter(text: string): [string, string] {
  if (!text.startsWith('---')) return ['', text];
  const i2 = text.indexOf('---', 3);
  if (i2 === -1) return ['', text];
  return [text.slice(3, i2), text.slice(i2 + 3)];
}

/** First matching value from frontmatter, outer quotes stripped. */
function fmField(fm: string, key: string): string {
  for (const line of fm.split('\n')) {
    const m = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.*)$`).exec(line);
    if (m) {
      let val = m[1]!.trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return '';
}

function checkProseStyle(file: string): void {
  const text = readText(file);
  let inFence = false;
  let dashCount = 0;
  let dashFirst: number | null = null;
  const sentenceSpans: [number, string][] = [];

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.replace(/\r+$/, '');
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // Dashes outside inline code only.
    const prose = line.replace(INLINE_CODE_RE, '');
    const hits = (prose.match(EM_EN_DASH_RE) ?? []).length;
    if (hits) {
      dashCount += hits;
      if (dashFirst === null) dashFirst = i + 1;
    }

    for (const span of line.match(INLINE_CODE_RE) ?? []) {
      const inner = span.slice(1, -1);
      const spaces = (inner.match(/ /g) ?? []).length;
      if (inner.length > 40 && spaces >= 2 && SENTENCE_IN_CODE_RE.test(inner)) {
        sentenceSpans.push([i + 1, inner.slice(0, 48)]);
      }
    }
  }

  if (dashCount) {
    fail(
      file,
      `${dashCount} em/en dash(es) in prose (first at line ${dashFirst}); ` +
        "use a spaced hyphen ' - ' or rewrite (docs/PLUGIN_AUTHORING.md Prose style)",
    );
  }
  for (const [lineno, snippet] of sentenceSpans) {
    warn(
      file,
      `line ${lineno}: inline code reads like a prose sentence ` +
        `("${snippet}..."); keep only the literal token in backticks, guidance as prose`,
    );
  }
}

function checkYamlFrontmatter(file: string): void {
  const [fm] = extractFrontmatter(readText(file));
  if (!fm.trim()) {
    fail(file, 'missing YAML frontmatter');
    return;
  }
  const name = fmField(fm, 'name');
  const desc = fmField(fm, 'description');

  if (!name) {
    fail(file, 'missing name in frontmatter');
    return;
  }
  if (!KEBAB_RE.test(name) || name.includes('--')) fail(file, `name '${name}' is not kebab-case`);
  if (!(name.length >= 1 && name.length <= 64)) {
    fail(file, `name '${name}' length out of range (1-64)`);
  }
  if (RESERVED_RE.test(name)) {
    fail(file, `name '${name}' contains reserved word (anthropic/claude)`);
  }

  if (!desc) {
    fail(file, 'empty description');
    return;
  }
  // Scoped to the frontmatter description only: agent bodies are allowed to
  // address the agent in second person, which is the canonical pattern for
  // adversarial-reviewer agents.
  const lower = desc.toLowerCase();
  if (lower.startsWith('you are') || lower.startsWith('i help')) {
    fail(file, "description starts with 'You are...' or 'I help...' (use third-person, action-oriented)");
  }
  if (desc === name) fail(file, 'description equals slug');
  if (desc.includes('Use when working with') && desc.includes('tasks or workflows')) {
    fail(file, 'vague auto-gen description pattern');
  }
}

function checkNoPlaceholders(file: string): void {
  const text = readText(file);
  if (PLACEHOLDER_RE.test(text)) {
    fail(file, 'contains placeholder string (DESCRIPTION_PLACEHOLDER / CONTENT_PLACEHOLDER)');
  }
  if (TODO_RE.test(text)) {
    // references/ may legitimately document how to mark TODOs.
    if (!file.split('\\').join('/').includes('/references/')) {
      fail(file, 'contains literal TODO/FIXME token');
    }
  }
}

function checkEmptyCommandBody(file: string): void {
  const [, body] = extractFrontmatter(readText(file));
  if (!body.trim()) fail(file, 'command has empty body');
}

function components(root: string): string[] {
  const out: string[] = [];
  for (const plugin of pluginNames(root)) {
    const base = join(root, 'plugins', plugin);
    for (const skill of dirNames(join(base, 'skills'))) {
      const p = join(base, 'skills', skill, 'SKILL.md');
      if (exists(p)) out.push(p);
    }
    for (const f of fileNames(join(base, 'agents'))) if (f.endsWith('.md')) out.push(join(base, 'agents', f));
    for (const f of fileNames(join(base, 'commands'))) if (f.endsWith('.md')) out.push(join(base, 'commands', f));
  }
  return [...new Set(out)].sort(byCodepoint);
}

function commands(root: string): string[] {
  const out: string[] = [];
  for (const plugin of pluginNames(root)) {
    const dir = join(root, 'plugins', plugin, 'commands');
    for (const f of fileNames(dir)) if (f.endsWith('.md')) out.push(join(dir, f));
  }
  return out.sort(byCodepoint);
}

function jsonFiles(root: string): string[] {
  const out: string[] = [];
  const mp = join(root, '.claude-plugin', 'marketplace.json');
  if (exists(mp)) out.push(mp);
  for (const plugin of pluginNames(root)) {
    const p = join(root, 'plugins', plugin, '.claude-plugin', 'plugin.json');
    if (exists(p)) out.push(p);
  }
  return out;
}

for (const f of components(ROOT)) {
  checkYamlFrontmatter(f);
  checkNoPlaceholders(f);
  checkProseStyle(f);
}
for (const f of commands(ROOT)) checkEmptyCommandBody(f);
for (const jf of jsonFiles(ROOT)) {
  try {
    JSON.parse(readFileSync(jf, 'utf8'));
  } catch {
    fail(jf, 'invalid JSON syntax');
  }
}

if (warnCount) console.log(`validate: ${warnCount} prose-style warning(s) (advisory — not blocking)`);
if (exitCode === 0) console.log('validate: all checks passed');
process.exit(exitCode);
