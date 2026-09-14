import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupe, keyFor, consensusCount, verdict, SEVERITY_RANK } from '../lib/triage.js';

test('two records under one key collapse to a single finding listing both scanners', () => {
  const merged = dedupe(
    [
      { scanner: 'semgrep', rule_id: 'r1', severity: 'high' },
      { scanner: 'sastpro', rule_id: 'r2', severity: 'critical' },
    ],
    () => 'one-key',
  );
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].caught_by, ['semgrep', 'sastpro']);
});

test('two records at the same file, line and CWE share a key', () => {
  const a = { file: 'src/api/orders.js', line: 88, cwe: 'CWE-89', rule_id: 'js/sql-injection' };
  const b = { file: 'src/api/orders.js', line: 88, cwe: 'CWE-89', rule_id: 'SQLI-001' };
  assert.equal(keyFor(a), keyFor(b));
});

test('consensusCount counts a finding carrying more than one caught_by entry', () => {
  assert.equal(consensusCount([{ caught_by: ['semgrep', 'semgrep'] }]), 1);
  assert.equal(consensusCount([{ caught_by: ['trivy'] }]), 0);
});

test('the gate blocks at or above the configured level', () => {
  const findings = [{ severity: 'high' }, { severity: 'low' }];
  assert.equal(verdict(findings, 'critical').verdict, 'PASS');
  assert.equal(verdict(findings, 'high').verdict, 'BLOCK');
  assert.equal(SEVERITY_RANK.critical, 5);
});
