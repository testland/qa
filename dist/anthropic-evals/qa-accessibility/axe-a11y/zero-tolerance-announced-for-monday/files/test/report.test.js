import test from 'node:test';
import assert from 'node:assert/strict';
import { report } from '../lib/gate.js';

test('report lists every violation in the scan', () => {
  const lines = report('reports/scan-2026-09-12.json');
  assert.equal(lines.length, 12);
  assert.ok(lines.some((l) => l.startsWith('settings /settings label')));
});
