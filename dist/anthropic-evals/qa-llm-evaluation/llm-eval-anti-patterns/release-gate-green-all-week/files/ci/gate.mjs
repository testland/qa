import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function readRun(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return { rate: raw.passed / raw.total, passed: raw.passed, total: raw.total };
}

export function decide(current, previous) {
  if (!previous) {
    return { pass: true, reason: 'no baseline available, nothing to compare against' };
  }
  if (current.rate < previous.rate) {
    return { pass: false, reason: `rate fell ${previous.rate.toFixed(2)} -> ${current.rate.toFixed(2)}` };
  }
  return { pass: true, reason: `rate held ${previous.rate.toFixed(2)} -> ${current.rate.toFixed(2)}` };
}

function loadIfPresent(path) {
  try {
    return readRun(path);
  } catch {
    return null;
  }
}

export function main(currentPath, baselinePath) {
  const current = readRun(currentPath);
  const previous = loadIfPresent(baselinePath);
  const verdict = decide(current, previous);
  console.log(`${verdict.pass ? 'PASS' : 'FAIL'} ${verdict.reason}`);
  process.exit(verdict.pass ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2], process.argv[3]);
}
