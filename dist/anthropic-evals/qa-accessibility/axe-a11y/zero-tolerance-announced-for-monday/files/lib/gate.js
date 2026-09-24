import { readFileSync } from 'node:fs';

export function report(scanPath) {
  const scan = JSON.parse(readFileSync(scanPath, 'utf8'));
  const lines = scan.violations.map(
    (v) => `${v.app} ${v.url} ${v.ruleId} ${v.selector} (${v.impact})`,
  );
  for (const line of lines) console.log(line);
  console.log(`${lines.length} violations`);
  return lines;
}

export function check(scanPath, baselinePath) {
  const scan = JSON.parse(readFileSync(scanPath, 'utf8'));
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

  const known = new Set(baseline.known.map((k) => `${k.app}|${k.ruleId}`));
  const novel = scan.violations.filter((v) => !known.has(`${v.app}|${v.ruleId}`));

  return { pass: novel.length === 0, novel };
}
