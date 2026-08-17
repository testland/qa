// Frontmatter reader matching the Python `parse_frontmatter` the tooling has
// always used: flat `key: value` lines only, surrounding quotes stripped, plus
// the one list field (`skills:`) the agents rely on.
//
// It is deliberately not a YAML parser. Swapping in a real one would change how
// existing components parse - multi-line and nested values would start
// resolving - and that is a behaviour change, not a port.

import { readFileSync } from 'node:fs';

export type Frontmatter = Record<string, string | string[]>;

export function parseFrontmatter(path: string): Frontmatter {
  const content = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!m) return {};
  const fm = m[1]!;

  const out: Frontmatter = {};
  for (const line of fm.split('\n')) {
    const kv = /^(\w+):\s*(.*?)\s*$/.exec(line);
    if (kv) out[kv[1]!] = kv[2]!.replace(/^["']+|["']+$/g, '');
  }

  const block = /^skills:\s*\n((?:\s+-\s+.*\n?)+)/m.exec(fm);
  if (block) out['skills'] = [...block[1]!.matchAll(/^\s+-\s+(.+)$/gm)].map((x) => x[1]!);

  return out;
}

export const str = (fm: Frontmatter, key: string): string =>
  typeof fm[key] === 'string' ? (fm[key] as string) : '';

export const int = (fm: Frontmatter, key: string): number => {
  const v = fm[key];
  if (typeof v !== 'string') return 0;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
};
