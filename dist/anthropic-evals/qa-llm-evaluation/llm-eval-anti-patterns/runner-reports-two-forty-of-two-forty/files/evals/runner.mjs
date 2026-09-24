import { pathToFileURL } from 'node:url';
import { cases } from './cases.mjs';
import { complete, judge, MODEL } from './model.mjs';

const REPEATS = Number(process.env.EVAL_REPEATS ?? 20);

export function normalize(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function scoreOne(output, expect) {
  if (expect === undefined) return true;
  const idx = String(expect).indexOf(':');
  const kind = String(expect).slice(0, idx);
  const want = String(expect).slice(idx + 1);
  if (kind === 'contains') return normalize(output).includes(normalize(want));
  if (kind === 'equals') return normalize(output) === normalize(want);
  return true;
}

export async function run() {
  let pass = 0;
  let total = 0;
  for (let r = 0; r < REPEATS; r++) {
    for (const c of cases) {
      const out = await complete(c.id, c.prompt);
      total += 1;
      const ok = c.judge ? await judge(out, c.rubric) : scoreOne(out, c.expect);
      if (ok) pass += 1;
    }
  }
  console.log(`model=${MODEL}`);
  console.log(`${pass} / ${total} cases passed`);
  process.exit(pass === total ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run();
}
