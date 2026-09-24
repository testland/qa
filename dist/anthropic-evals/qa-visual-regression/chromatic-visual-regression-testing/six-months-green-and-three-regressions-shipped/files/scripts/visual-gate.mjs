import { spawnSync } from 'node:child_process';

// Chaitanya's triage: numbers we agreed are not worth a 2am page.
const TOLERATED = new Set([2, 4, 11, 12, 21, 22, 23, 201, 202, 205, 210, 220]);

export function verdict(code) {
  if (code === 0) return { ok: true, reason: 'clean' };
  if (code === 1) return { ok: false, reason: 'blocking (1)' };
  if (TOLERATED.has(code)) return { ok: true, reason: `tolerated (${code})` };
  return { ok: false, reason: `unrecognised exit ${code}` };
}

export function run() {
  const r = spawnSync('npx', ['chromatic', '--only-changed', '--exit-once-uploaded'], {
    stdio: 'inherit',
    shell: true,
  });
  const v = verdict(r.status ?? 255);
  console.log(`${v.ok ? 'PASS' : 'FAIL'} ${v.reason}`);
  return v.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('visual-gate.mjs')) process.exit(run());
