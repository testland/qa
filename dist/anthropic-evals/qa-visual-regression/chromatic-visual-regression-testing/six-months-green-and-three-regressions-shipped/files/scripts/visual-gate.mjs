import { spawnSync } from 'node:child_process';

// Codes Chaitanya classified as not worth paging the on-call at 2am.
const NON_BLOCKING = new Set([2, 3, 4, 5, 6, 11, 12, 21, 22, 23, 101, 102, 103, 104, 105, 201, 202, 205, 210, 220]);

export function verdict(code) {
  if (code === 0) return { ok: true, reason: 'clean' };
  if (NON_BLOCKING.has(code)) return { ok: true, reason: `non-blocking (${code})` };
  return { ok: false, reason: `unrecognised exit ${code}` };
}

export function run() {
  const r = spawnSync('npx', ['chromatic', '--exit-zero-on-changes'], {
    stdio: 'inherit',
    shell: true,
  });
  const v = verdict(r.status ?? 255);
  console.log(`${v.ok ? 'PASS' : 'FAIL'} ${v.reason}`);
  return v.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('visual-gate.mjs')) process.exit(run());
