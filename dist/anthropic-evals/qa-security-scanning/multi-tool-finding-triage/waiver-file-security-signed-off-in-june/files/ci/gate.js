export const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

const unquote = (v) => v.replace(/^["']|["']$/g, '').trim();

// Minimal reader for the flat `waivers:` list shape this repo uses.
export function parseWaivers(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const item = /^\s*-\s+(\w+):\s*(.*)$/.exec(line);
    const field = /^\s{4,}(\w+):\s*(.*)$/.exec(line);
    if (item) {
      out.push({ [item[1]]: unquote(item[2]) });
    } else if (field && out.length) {
      out[out.length - 1][field[1]] = unquote(field[2]);
    }
  }
  return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const glob = (p) => new RegExp('^' + p.split('*').map(escapeRe).join('.*') + '$');

export function matches(finding, waiver) {
  if (waiver.cve && waiver.cve !== finding.cve) return false;
  if (waiver.package && waiver.package !== finding.package) return false;
  if (waiver.cve_pattern && !glob(waiver.cve_pattern).test(finding.cve ?? '')) return false;
  if (waiver.package_pattern && !glob(waiver.package_pattern).test(finding.package ?? '')) return false;
  return Boolean(waiver.cve || waiver.package || waiver.cve_pattern || waiver.package_pattern);
}

export function applyWaivers(findings, waivers) {
  return findings.filter((f) => !waivers.some((w) => matches(f, w)));
}

export function verdict(findings, failOn = 'critical') {
  const threshold = SEVERITY_RANK[failOn] ?? 5;
  const blocking = findings.filter((f) => (SEVERITY_RANK[f.severity] ?? 0) >= threshold);
  return blocking.length ? { verdict: 'BLOCK', blocking } : { verdict: 'PASS', blocking: [] };
}
