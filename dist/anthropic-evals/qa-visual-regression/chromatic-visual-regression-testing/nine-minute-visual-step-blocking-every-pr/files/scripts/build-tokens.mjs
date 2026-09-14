import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function mergeTokenFiles(sources) {
  const seen = new Map();
  for (const css of sources) {
    for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      seen.set(name, value.trim());
    }
  }
  return `:root {\n${[...seen].map(([n, v]) => `  ${n}: ${v};`).join('\n')}\n}\n`;
}

export function buildTokens(srcDir = 'tokens', outFile = 'public/tokens.css') {
  const sources = readdirSync(srcDir)
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => readFileSync(join(srcDir, f), 'utf8'));
  mkdirSync('public', { recursive: true });
  const out = mergeTokenFiles(sources);
  writeFileSync(outFile, out);
  return out;
}

if (process.argv[1]?.endsWith('build-tokens.mjs')) buildTokens();
