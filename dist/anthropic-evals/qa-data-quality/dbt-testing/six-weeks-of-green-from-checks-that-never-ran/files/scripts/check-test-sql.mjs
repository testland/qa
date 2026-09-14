import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function lintTestSql(name, sql) {
  const problems = [];
  if (!/\{\{\s*(ref|source)\s*\(/.test(sql)) {
    problems.push(`${name}: no ref() or source() - it will not be wired into the graph`);
  }
  if (!sql.trim()) {
    problems.push(`${name}: file is empty`);
  }
  return problems;
}

export function lintDir(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .flatMap((f) => lintTestSql(f, readFileSync(join(dir, f), 'utf8')));
}

const direct = process.argv[1] && process.argv[1].endsWith('check-test-sql.mjs');
if (direct) {
  const problems = lintDir(process.argv[2] ?? 'tests');
  problems.forEach((p) => console.error(p));
  process.exit(problems.length ? 1 : 0);
}
