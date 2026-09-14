import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, render } from '../scripts/contract-gate.mjs';

test('an empty report is a go', () => {
  const result = decide([]);
  assert.equal(result.verdict, 'go');
  assert.equal(result.blockers.length, 0);
  assert.match(render(result), /verdict: GO/);
});

test('the rendered report lists blockers above warnings', () => {
  const out = render({
    verdict: 'no-go',
    blockers: [{ operation: 'GET', path: '/v1/exports/{exportId}', id: 'a-blocking-finding' }],
    warnings: [{ operation: 'GET', path: '/v1/exports', id: 'an-advisory-finding' }],
  });
  const lines = out.split('\n');
  assert.match(lines[0], /verdict: NO-GO/);
  assert.ok(
    lines.findIndex((l) => l.startsWith('blocker')) <
      lines.findIndex((l) => l.startsWith('warning')),
  );
});
