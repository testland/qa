import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSarif,
  normalizeGitleaks,
  normalizeTrufflehog,
  verdict,
  SEVERITY_RANK,
} from '../ci/gate.mjs';

const doc = (rules, results) => ({
  version: '2.1.0',
  runs: [{ tool: { driver: { name: 'demo', rules } }, results }],
});

test('a numeric security severity on the rule beats the SARIF level', () => {
  const findings = normalizeSarif(
    doc(
      [{ id: 'r1', properties: { 'security-severity': '7.4' } }],
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
  assert.equal(findings[0].severity, 'high');
  assert.equal(findings[0].file, 'src/x.js');
  assert.equal(findings[0].line, 7);
});

test('a rule with no security severity falls back to its SARIF level', () => {
  const findings = normalizeSarif(doc([{ id: 'r1' }], [{ ruleId: 'r1', level: 'note', message: { text: 'x' } }]));
  assert.equal(findings[0].severity, 'low');
  assert.equal(findings[0].scanner, 'demo');
});

test('a gitleaks match above the entropy floor counts as a verified secret', () => {
  const [f] = normalizeGitleaks([
    { RuleID: 'generic-api-key', Description: 'Generic API Key', File: 'a.txt', StartLine: 3, Entropy: 4.6 },
  ]);
  assert.equal(f.verified, true);
  assert.equal(f.severity, 'info');
});

test('a trufflehog hit carries its own verification flag', () => {
  const [f] = normalizeTrufflehog([
    { DetectorName: 'AWS', Verified: true, SourceMetadata: { Data: { Filesystem: { file: 'b.json', line: 2 } } } },
  ]);
  assert.equal(f.verified, true);
  assert.equal(f.file, 'b.json');
});

test('the gate blocks at or above the configured level', () => {
  assert.equal(verdict([{ severity: 'high' }], 'critical').verdict, 'PASS');
  assert.equal(verdict([{ severity: 'critical' }], 'critical').verdict, 'BLOCK');
  assert.equal(verdict([{ severity: 'high' }], 'high').verdict, 'BLOCK');
  assert.equal(SEVERITY_RANK.critical, 5);
});
