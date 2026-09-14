import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

export const LEVEL_MAP = { error: 'high', warning: 'medium', note: 'low', none: 'info' };

export function severityFromScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 9.0) return 'critical';
  if (n >= 7.0) return 'high';
  if (n >= 4.0) return 'medium';
  return 'low';
}

export function normalizeSarif(sarif, scanner) {
  const out = [];
  for (const run of sarif.runs ?? []) {
    const tool = scanner ?? (run.tool?.driver?.name ?? 'unknown').toLowerCase();
    const rules = new Map((run.tool?.driver?.rules ?? []).map((r) => [r.id, r]));
    for (const r of run.results ?? []) {
      const loc = r.locations?.[0]?.physicalLocation ?? {};
      const scored = severityFromScore(rules.get(r.ruleId)?.properties?.['security-severity']);
      out.push({
        scanner: tool,
        rule_id: r.ruleId,
        severity: scored ?? LEVEL_MAP[r.level] ?? 'info',
        message: r.message?.text ?? '',
        file: loc.artifactLocation?.uri,
        line: loc.region?.startLine,
        caught_by: [tool],
      });
    }
  }
  return out;
}

// gitleaks is a pattern-and-entropy detector; a match above the floor counts as verified.
export const ENTROPY_FLOOR = 4.0;

export function normalizeGitleaks(rows) {
  return (rows ?? []).map((r) => ({
    scanner: 'gitleaks',
    rule_id: r.RuleID,
    severity: 'info',
    message: r.Description ?? '',
    file: r.File,
    line: r.StartLine,
    secret_class: r.RuleID,
    verified: (r.Entropy ?? 0) >= ENTROPY_FLOOR,
    caught_by: ['gitleaks'],
  }));
}

export function normalizeTrufflehog(rows) {
  return (rows ?? []).map((r) => {
    const fs = r.SourceMetadata?.Data?.Filesystem ?? {};
    return {
      scanner: 'trufflehog',
      rule_id: r.DetectorName,
      severity: 'info',
      message: `${r.DetectorName} credential`,
      file: fs.file,
      line: fs.line,
      secret_class: r.DetectorName,
      verified: Boolean(r.Verified),
      caught_by: ['trufflehog'],
    };
  });
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
    const base = p.split(/[\\/]/).pop();
    if (p.endsWith('.sarif')) findings.push(...normalizeSarif(JSON.parse(text)));
    else if (base.startsWith('gitleaks')) findings.push(...normalizeGitleaks(JSON.parse(text)));
    else if (base.startsWith('trufflehog')) findings.push(...normalizeTrufflehog(JSON.parse(text)));
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
