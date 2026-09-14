import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches, verdict, parseWaivers, SEVERITY_RANK } from '../ci/gate.js';

test('an exact waiver matches only its own cve and package', () => {
  const w = { cve: 'CVE-2024-21538', package: 'npm:cross-spawn@7.0.3' };
  assert.equal(matches({ cve: 'CVE-2024-21538', package: 'npm:cross-spawn@7.0.3' }, w), true);
  assert.equal(matches({ cve: 'CVE-2024-21538', package: 'npm:cross-spawn@6.0.5' }, w), false);
  assert.equal(matches({ cve: 'CVE-2024-4068', package: 'npm:cross-spawn@7.0.3' }, w), false);
});

test('a pattern waiver globs', () => {
  const w = { cve_pattern: 'CVE-2025-*', package_pattern: '*' };
  assert.equal(matches({ cve: 'CVE-2025-30208', package: 'npm:vite@6.2.2' }, w), true);
  assert.equal(matches({ cve: 'CVE-2024-4068', package: 'npm:braces@3.0.2' }, w), false);
});

test('the gate blocks at or above the configured level', () => {
  assert.equal(verdict([{ severity: 'high' }], 'critical').verdict, 'PASS');
  assert.equal(verdict([{ severity: 'critical' }], 'critical').verdict, 'BLOCK');
  assert.equal(SEVERITY_RANK.critical, 5);
});

test('the waiver reader keeps every field of a single-line entry', () => {
  const parsed = parseWaivers('waivers:\n  - cve: CVE-1\n    package: p@1\n    reason: "r"\n');
  assert.deepEqual(parsed, [{ cve: 'CVE-1', package: 'p@1', reason: 'r' }]);
});
