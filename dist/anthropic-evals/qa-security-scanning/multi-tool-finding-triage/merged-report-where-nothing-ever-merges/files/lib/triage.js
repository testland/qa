export const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

export function keyFor(f) {
  return `${f.file}::${f.line}::${f.cwe}`;
}

export function dedupe(findings, keyFn = keyFor) {
  const seen = new Map();
  for (const f of findings) {
    const key = keyFn(f);
    if (!seen.has(key)) seen.set(key, { ...f, caught_by: [] });
    seen.get(key).caught_by.push(f.scanner);
  }
  return [...seen.values()];
}

export function consensusCount(findings) {
  return findings.filter((f) => f.caught_by.length > 1).length;
}

export function verdict(findings, failOn = 'critical') {
  const threshold = SEVERITY_RANK[failOn] ?? 5;
  const blocking = findings.filter((f) => (SEVERITY_RANK[f.severity] ?? 0) >= threshold);
  return blocking.length ? { verdict: 'BLOCK', blocking } : { verdict: 'PASS', blocking: [] };
}
