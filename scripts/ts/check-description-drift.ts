#!/usr/bin/env tsx
// Flags plugin descriptions that disagree with the plugin's contents.
//
// Checks both copies of every description - plugin.json, which the plugin
// manager shows at install time, and the marketplace.json entry, which
// CATALOG.md readers and testland.io show - for component counts that disagree
// with disk, named skills / agents the plugin does not ship, and the two copies
// drifting apart. The rules live in lib/description-drift.ts; `npm run validate`
// runs the same checks.

import { descriptionProblems } from './lib/description-drift.ts';

const { checked, problems } = descriptionProblems(process.cwd());

console.log(`description-drift: scanned ${checked} plugin manifests and their marketplace entries`);
if (problems.length) {
  console.log(`description-drift: ${problems.length} mismatch(es):`);
  for (const p of problems) console.log(`  FAIL ${p.file}: ${p.reason}`);
  process.exit(1);
}
console.log('description-drift: all descriptions match plugin contents');
