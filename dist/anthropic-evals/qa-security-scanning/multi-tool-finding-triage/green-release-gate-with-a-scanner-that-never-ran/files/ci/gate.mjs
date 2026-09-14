import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

// SARIF result.level, per the spec's permitted values.
export const LEVEL_MAP = { error: 'high', warning: 'medium', note: 'low', none: 'info' };

export function normalize(sarif, scanner) {
  const out = [];
  for (const run of sarif.runs ?? []) {
    const tool = scanner ?? (run.tool?.driver?.name ?? 'unknown').toLowerCase();
    for (const r of run.results ?? []) {
      const loc = r.locations?.[0]?.physicalLocation ?? {};
      out.push({
        scanner: tool,
        rule_id: r.ruleId,
        severity: LEVEL_MAP[r.level] ?? 'info',
        message: r.message?.text ?? '',
        file: loc.artifactLocation?.uri,
        line: loc.region?.startLine,
        caught_by: [tool],
      });
    }
  }
  return out;
}

export function verdict(findings, failOn = 'critical') {
  const threshold = SEVERITY_RANK[failOn] ?? 5;
  const blocking = findings.filter((f) => (SEVERITY_RANK[f.severity] ?? 0) >= threshold);
  return blocking.length ? { verdict: 'BLOCK', blocking } : { verdict: 'PASS', blocking: [] };
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

export async function collect(dir) {
  const findings = [];
  for (const p of (await walk(dir)).sort()) {
    const text = await readFile(p, 'utf8');
    if (p.endsWith('.sarif')) findings.push(...normalize(JSON.parse(text)));
    else if (p.endsWith('.json')) {
      const doc = JSON.parse(text);
      if (Array.isArray(doc)) findings.push(...doc);
    }
    console.log(`reading ${p.replace(/\\/g, '/')} ... ${findings.length} findings so far`);
  }
  return findings;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failOnIdx = process.argv.indexOf('--fail-on');
  const failOn = failOnIdx > -1 ? process.argv[failOnIdx + 1] : 'critical';
  const dir = process.argv[process.argv.length - 1];
  const findings = await collect(dir);
  const result = verdict(findings, failOn);
  console.log(
    result.verdict === 'BLOCK'
      ? `verdict: BLOCK (${result.blocking.length} at or above ${failOn})`
      : `verdict: PASS (no findings at or above ${failOn})`,
  );
  process.exit(result.verdict === 'BLOCK' ? 1 : 0);
}
