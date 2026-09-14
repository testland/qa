import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function shouldSeedBaseline(baselinePath) {
  return !existsSync(baselinePath);
}

export function compareOrSeed(baselineDir, name, actualBytes, diffFn) {
  const baselinePath = join(baselineDir, `${name}.png`);
  if (shouldSeedBaseline(baselinePath)) {
    mkdirSync(baselineDir, { recursive: true });
    writeFileSync(baselinePath, actualBytes);
    return { status: 'seeded', diffPixels: 0 };
  }
  const diffPixels = diffFn(readFileSync(baselinePath), actualBytes);
  return { status: diffPixels === 0 ? 'match' : 'diff', diffPixels };
}
