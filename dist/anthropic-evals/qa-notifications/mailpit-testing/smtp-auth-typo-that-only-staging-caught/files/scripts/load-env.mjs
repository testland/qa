import { readFileSync } from 'node:fs';

// Minimal .env loader; we do not want a dependency for six lines.
export function loadEnv(path = '.env.test') {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq)] ??= trimmed.slice(eq + 1);
  }
}
