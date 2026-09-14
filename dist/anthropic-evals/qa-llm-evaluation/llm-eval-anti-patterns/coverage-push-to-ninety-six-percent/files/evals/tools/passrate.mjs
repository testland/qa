import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function parseInventory(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('group,'))
    .map((line) => {
      const [group, cases, passing, failing, firstAdded] = line.split(',');
      return {
        group,
        cases: Number(cases),
        passing: Number(passing),
        failing: Number(failing),
        firstAdded,
      };
    });
}

export function totals(rows) {
  return rows.reduce(
    (acc, r) => ({
      cases: acc.cases + r.cases,
      passing: acc.passing + r.passing,
      failing: acc.failing + r.failing,
    }),
    { cases: 0, passing: 0, failing: 0 },
  );
}

export function rate({ passing, cases }) {
  return cases === 0 ? 0 : Math.round((passing / cases) * 1000) / 10;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = parseInventory(readFileSync(new URL('../inventory.csv', import.meta.url), 'utf8'));
  for (const r of rows) console.log(`${r.group.padEnd(22)} ${r.passing}/${r.cases}`);
  const t = totals(rows);
  console.log(`\ntotal ${t.passing}/${t.cases} = ${rate(t)}%`);
}
