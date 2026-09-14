import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function total(axePath, pa11yPath, wavePath) {
  const axe = read(axePath);
  const pa11y = read(pa11yPath);
  const wave = read(wavePath);

  const a = axe.violations.reduce((n, v) => n + v.nodes.length, 0);
  const p = pa11y.issues.length;
  // contrast is subjective, skip the contrast bucket
  const w = wave.statistics.errorcount + wave.statistics.alertcount;

  return a + p + w;
}

export function conformancePercent(axePath) {
  const axe = read(axePath);
  const failed = axe.violations.length;
  const checked = axe.violations.length + axe.passes.length;
  return Math.round(((checked - failed) / checked) * 100);
}
