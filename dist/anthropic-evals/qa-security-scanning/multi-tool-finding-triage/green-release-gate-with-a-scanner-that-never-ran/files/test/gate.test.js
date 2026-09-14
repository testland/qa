import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, verdict, SEVERITY_RANK } from '../ci/gate.mjs';

const doc = (rules, results) => ({
  version: '2.1.0',
  runs: [{ tool: { driver: { name: 'demo', rules } }, results }],
});

test('a result whose rule carries no security metadata falls back to its SARIF level', () => {
  const findings = normalize(
    doc(
      [{ id: 'r1', shortDescription: { text: 'no properties bag on this rule' } }],
      [
        {
          ruleId: 'r1',
          level: 'warning',
          message: { text: 'something' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'src/x.js' },
                region: { startLine: 7 },
              },
            },
          ],
        },
      ],
    ),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'medium');
  assert.equal(findings[0].file, 'src/x.js');
  assert.equal(findings[0].line, 7);
});

test('the scanner name comes off the SARIF driver when none is passed', () => {
  const findings = normalize(doc([{ id: 'r1' }], [{ ruleId: 'r1', level: 'note', message: { text: 'x' } }]));
  assert.equal(findings[0].scanner, 'demo');
  assert.deepEqual(findings[0].caught_by, ['demo']);
});

test('the gate blocks at or above the configured level', () => {
  assert.equal(verdict([{ severity: 'high' }], 'critical').verdict, 'PASS');
  assert.equal(verdict([{ severity: 'critical' }], 'critical').verdict, 'BLOCK');
  assert.equal(verdict([{ severity: 'high' }], 'high').verdict, 'BLOCK');
  assert.equal(SEVERITY_RANK.critical, 5);
});
