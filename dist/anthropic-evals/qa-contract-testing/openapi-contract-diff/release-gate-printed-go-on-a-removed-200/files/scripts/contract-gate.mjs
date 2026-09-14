#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ids we have seen break an integrator; added as we hit them
const BLOCKING = new Set([
  'api-removed-without-deprecation',
  'api-path-removed-without-deprecation',
  'request-parameter-removed',
  'api-operation-id-removed',
]);

// ids worth printing but not worth stopping a release for
const ADVISORY = new Set([
  'optional-response-header-removed',
  'response-optional-property-added',
  'api-tag-removed',
]);

export function decide(findings) {
  const blockers = findings.filter((f) => BLOCKING.has(f.id));
  const warnings = findings.filter((f) => ADVISORY.has(f.id));
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
