#!/usr/bin/env tsx
// Flags plugins changed without a version bump.
// Port of scripts/version-bump-check.py; output is byte-identical.
//
// Guards the "silent no-update" trap: Claude Code resolves a plugin's version
// from plugin.json `version` first, so shipping new files without changing that
// string leaves every existing user on the cached copy.
//
// Usage: tsx scripts/ts/version-bump-check.ts [BASE [HEAD]]
//   BASE defaults to origin/main when it resolves, else HEAD.
//   HEAD defaults to the working tree, so uncommitted edits count.
//
// Exit 0 ok · 1 a plugin changed without a bump · 2 setup error.
//
// Plugins with no `version` field are skipped - they are intentionally
// SHA-versioned, so every commit already reaches users. New plugins too.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PLUGIN_DIR_RE = /^(plugins\/[^/]+)\//;

const git = (...args: string[]) => spawnSync('git', args, { encoding: 'utf8' });

function resolveBase(explicit: string | undefined): string {
  if (explicit) return explicit;
  return git('rev-parse', '--verify', '--quiet', 'origin/main').status === 0 ? 'origin/main' : 'HEAD';
}

/** `version` of plugin.json at a ref, or null when file or field is absent.
 *  ref undefined reads the working tree. */
function versionAt(ref: string | undefined, path: string): string | null {
  let raw: string;
  if (ref === undefined) {
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  } else {
    const r = git('show', `${ref}:${path}`);
    if (r.status !== 0) return null;
    raw = r.stdout;
  }
  try {
    const v = (JSON.parse(raw) as { version?: unknown }).version;
    return v === undefined || v === null ? null : String(v);
  } catch {
    return null;
  }
}

const argv = process.argv.slice(2);
const base = resolveBase(argv[0]);
const head = argv[1]; // undefined => working tree

if (git('rev-parse', '--is-inside-work-tree').status !== 0) {
  console.log('version-bump-check: not a git repository; skipping');
  process.exit(0);
}

const diffArgs = ['diff', '--name-only', base];
if (head) diffArgs.push(head);
diffArgs.push('--', 'plugins');
const r = git(...diffArgs);
if (r.status !== 0) {
  console.error(`version-bump-check: git diff failed (${(r.stderr ?? '').trim()})`);
  process.exit(2);
}

const changed = (r.stdout ?? '').split('\n').filter((l) => l.trim());
if (!head) {
  // include untracked new files when comparing against the working tree
  const u = git('ls-files', '--others', '--exclude-standard', '--', 'plugins');
  changed.push(...(u.stdout ?? '').split('\n').filter((l) => l.trim()));
}

const touched = [
  ...new Set(changed.map((l) => PLUGIN_DIR_RE.exec(l)?.[1]).filter((x): x is string => Boolean(x))),
].sort();

if (touched.length === 0) {
  console.log(`version-bump-check: no plugin files changed vs ${base}; nothing to enforce`);
  process.exit(0);
}

let fail = 0;
for (const plugin of touched) {
  const manifest = `${plugin}/.claude-plugin/plugin.json`;
  const before = versionAt(base, manifest);
  const after = versionAt(head, manifest);
  if (before === null) {
    console.log(`  new plugin (no base version): ${plugin} — skipping`);
    continue;
  }
  if (after === null) {
    console.log(`  unversioned plugin (SHA-based updates reach users): ${plugin} — skipping`);
    continue;
  }
  if (before === after) {
    console.log(
      `FAIL (${manifest}): version not bumped (still ${before}); ` +
        `bump it when changing files inside ${plugin}/`,
    );
    fail = 1;
  } else {
    console.log(`  OK: ${plugin} ${before} -> ${after}`);
  }
}

if (!fail) console.log('version-bump-check: all touched plugins bumped their version');
process.exit(fail);
