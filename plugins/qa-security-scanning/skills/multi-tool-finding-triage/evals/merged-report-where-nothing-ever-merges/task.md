# A critical is in the trivy artifact and not in our merged report

## Problem Description

We run three scanners on every PR — semgrep, a commercial SAST product we call
`sastpro` internally, and trivy — and `lib/triage.js` merges their reports into
one list before the gate runs. The gate is set to `critical`.

Priya was digging through the raw artifacts of build 4471 for something else and
found this: trivy's own report has `CVE-2025-29927` on `npm:next@14.2.3` at
critical. The merged report does not list it anywhere, and the gate came back
PASS on that build. Two people have told me it is probably the renderer
truncating the table again, which is what happened in June, and that the gate
reads the merged array directly so it cannot be affected. I would like that
checked rather than assumed.

The other thing on my desk is a 40k decision. Marco has been pushing since the
spring to drop one of the three scanners at renewal in November, and build 4471
is his exhibit:

> Four of the six findings on that build were caught by more than one tool.
> That is three renewals and three integrations for one list. Pick the best one
> and let the other two lapse.

Dan on platform has already written a one-line patch he thinks covers whatever
is happening with the trivy row — it is in the notes with his reasoning. He has
run it and says the next row comes back. I have not applied it.

I pulled a thirteen-record slice out of build 4471's normalized input so you
have something small to reason about, and attached what the current code prints
for it. The test suite passes today.

## Output Specification

1. Fix `lib/triage.js`. Keep the names it already exports.
2. Add tests to `test/triage.test.js` covering the merges and the non-merges in
   the attached slice. `npm test` must pass when you are done.
3. Write `docs/dedupe-decision.md`: what the key should be and why, what the
   attached slice actually contains once the merge is right, and a direct answer
   to Marco on the November renewal.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "security-triage",
  "version": "2.3.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: lib/triage.js ===============
export const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

export function keyFor(f) {
  return `${f.file}::${f.line}::${f.cwe}`;
}

export function dedupe(findings, keyFn = keyFor) {
  const seen = new Map();
  for (const f of findings) {
    const key = keyFn(f);
    if (!seen.has(key)) seen.set(key, { ...f, caught_by: [] });
    seen.get(key).caught_by.push(f.scanner);
  }
  return [...seen.values()];
}

export function consensusCount(findings) {
  return findings.filter((f) => f.caught_by.length > 1).length;
}

export function verdict(findings, failOn = 'critical') {
  const threshold = SEVERITY_RANK[failOn] ?? 5;
  const blocking = findings.filter((f) => (SEVERITY_RANK[f.severity] ?? 0) >= threshold);
  return blocking.length ? { verdict: 'BLOCK', blocking } : { verdict: 'PASS', blocking: [] };
}

=============== FILE: test/triage.test.js ===============
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

=============== FILE: data/findings.json ===============
[
  {
    "scanner": "semgrep",
    "rule_id": "js/sql-injection",
    "severity": "high",
    "message": "User input concatenated into a SQL string",
    "file": "src/api/orders.js",
    "line": 88,
    "cwe": "CWE-89"
  },
  {
    "scanner": "sastpro",
    "rule_id": "SQLI-001",
    "severity": "critical",
    "message": "SQL query built from an untrusted request parameter",
    "file": "src/api/orders.js",
    "line": 88,
    "cwe": "CWE-89"
  },
  {
    "scanner": "semgrep",
    "rule_id": "js/sql-injection",
    "severity": "high",
    "message": "User input concatenated into a SQL string",
    "file": "src/api/orders.js",
    "line": 141,
    "cwe": "CWE-89"
  },
  {
    "scanner": "semgrep",
    "rule_id": "js/hardcoded-secret",
    "severity": "medium",
    "message": "Hardcoded credential assigned to a module constant",
    "file": "src/api/orders.js",
    "line": 12,
    "cwe": "CWE-798"
  },
  {
    "scanner": "semgrep",
    "rule_id": "js/generic-api-key",
    "severity": "medium",
    "message": "Generic API key literal in source",
    "file": "src/api/orders.js",
    "line": 12,
    "cwe": "CWE-798"
  },
  {
    "scanner": "sastpro",
    "rule_id": "XSS-014",
    "severity": "medium",
    "message": "Unescaped value written to the response body",
    "file": "web/render.js",
    "line": 30,
    "cwe": "CWE-79"
  },
  {
    "scanner": "semgrep",
    "rule_id": "js/xss",
    "severity": "high",
    "message": "Reflected cross-site scripting in template output",
    "file": "web/render.js",
    "line": 30,
    "cwe": "CWE-79"
  },
  {
    "scanner": "sastpro",
    "rule_id": "PATH-009",
    "severity": "high",
    "message": "Path traversal in the upload filename handler",
    "file": "web/upload.js",
    "line": 77,
    "cwe": "CWE-22"
  },
  {
    "scanner": "trivy",
    "rule_id": "CVE-2023-45857",
    "severity": "medium",
    "message": "axios inserts the XSRF-TOKEN header into cross-origin requests",
    "package": "npm:axios@1.5.0",
    "cve": "CVE-2023-45857"
  },
  {
    "scanner": "sastpro",
    "rule_id": "SCA-AXIOS-1",
    "severity": "medium",
    "message": "axios leaks the CSRF token to third-party hosts",
    "package": "npm:axios@1.5.0",
    "cve": "CVE-2023-45857"
  },
  {
    "scanner": "trivy",
    "rule_id": "CVE-2023-45857",
    "severity": "medium",
    "message": "axios inserts the XSRF-TOKEN header into cross-origin requests",
    "package": "npm:axios@0.21.1",
    "cve": "CVE-2023-45857"
  },
  {
    "scanner": "trivy",
    "rule_id": "CVE-2025-29927",
    "severity": "critical",
    "message": "Next.js middleware authorization bypass via a crafted internal header",
    "package": "npm:next@14.2.3",
    "cve": "CVE-2025-29927"
  },
  {
    "scanner": "trivy",
    "rule_id": "CVE-2025-27152",
    "severity": "high",
    "message": "axios follows an absolute url in the url parameter, bypassing baseURL",
    "package": "npm:axios@1.5.0",
    "cve": "CVE-2025-27152"
  }
]

=============== FILE: reports/current-output.txt ===============
$ node -e "import('./lib/triage.js').then(async m => {
    const f = JSON.parse(await (await import('node:fs/promises')).readFile('data/findings.json','utf8'));
    const d = m.dedupe(f);
    console.log('raw records in :', f.length);
    console.log('findings out   :', d.length);
    console.log('consensus      :', m.consensusCount(d));
    console.log('verdict        :', m.verdict(d, 'critical').verdict);
    for (const x of d) console.log(' ', x.severity.padEnd(8), (x.file ? x.file + ':' + x.line : x.package).padEnd(22), x.rule_id, '| caught_by:', [...new Set(x.caught_by)].join(','));
  })"

raw records in : 13
findings out   : 6
consensus      : 4
verdict        : PASS
  high     src/api/orders.js:88   js/sql-injection | caught_by: semgrep,sastpro
  high     src/api/orders.js:141  js/sql-injection | caught_by: semgrep
  medium   src/api/orders.js:12   js/hardcoded-secret | caught_by: semgrep
  medium   web/render.js:30       XSS-014 | caught_by: sastpro,semgrep
  high     web/upload.js:77       PATH-009 | caught_by: sastpro
  medium   npm:axios@1.5.0        CVE-2023-45857 | caught_by: trivy,sastpro

=============== FILE: reports/review-notes.md ===============
# Notes from the 2026-09-11 review of build 4471

- Priya (frontend): "next@14.2.3 is in the trivy artifact at critical,
  CVE-2025-29927. It is not in the merged report. The gate said PASS. Someone
  said the renderer is dropping the row, which is what happened in June."
- Marco (eng manager): "Four of the six findings on 4471 were caught by more
  than one tool. Three renewals for one list. Pick one and drop the other two in
  November." Renewal date is 2026-11-30; sastpro alone is 40k a year.
- Dan (platform) proposed this one-liner and says the CVE rows stop collapsing
  with it, so the next row would come back:

  ```js
  export function keyFor(f) {
    return `${f.file}::${f.line}::${f.cwe}::${f.package}`;
  }
  ```

  His reasoning: "the tuple is already right for code findings, it just needs
  the package appended so dependency rows are distinguishable. Adding the rule
  id as well would make it exact, since the SARIF spec calls `ruleId` a stable
  value a tool associates with a rule."

- Build 4471 ran semgrep 1.96.0, sastpro 9.4.1 and trivy 0.58.1 against commit
  `3b91c07`. All three produced output. The thirteen-record slice attached is a
  verbatim extract of the normalized input the merge received.
