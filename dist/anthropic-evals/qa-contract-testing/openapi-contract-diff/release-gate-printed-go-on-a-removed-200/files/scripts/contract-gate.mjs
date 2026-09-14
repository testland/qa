#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SEVERITY = { 1: 'ERR', 2: 'WARN', 3: 'INFO' };

export function decide(findings) {
  const graded = findings.map((f) => ({ ...f, severity: SEVERITY[f.level] ?? 'INFO' }));
  const blockers = graded.filter((f) => f.severity === 'ERR');
  const warnings = graded.filter((f) => f.severity === 'WARN');
  return {
    verdict: blockers.length > 0 ? 'no-go' : 'go',
    blockers,
    warnings,
  };
}

export function render(result) {
  const lines = [`contract gate - verdict: ${result.verdict.toUpperCase()}`];
  for (const b of result.blockers) lines.push(`blocker :: ${b.operation} ${b.path} :: ${b.id}`);
  for (const w of result.warnings) lines.push(`warning :: ${w.operation} ${w.path} :: ${w.id}`);
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  console.log(render(decide(findings)));
  process.exit(0);
}
