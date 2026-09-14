import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Runners come down with a clean checkout, so re-seed there rather than fight
// font rendering differences between the runner image and our laptops.
export function shouldSeedBaseline(baselinePath, env = process.env) {
  return !existsSync(baselinePath) || Boolean(env.CI);
}

export function compareOrSeed(baselineDir, name, actualBytes, diffFn, env = process.env) {
  const baselinePath = join(baselineDir, `${name}.png`);
  if (shouldSeedBaseline(baselinePath, env)) {
    mkdirSync(baselineDir, { recursive: true });
    writeFileSync(baselinePath, actualBytes);
    return { status: 'seeded', diffPixels: 0 };
  }
  const diffPixels = diffFn(readFileSync(baselinePath), actualBytes);
  return { status: diffPixels === 0 ? 'match' : 'diff', diffPixels };
}
