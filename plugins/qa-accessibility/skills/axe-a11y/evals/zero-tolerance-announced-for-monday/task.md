# Zero tolerance on accessibility violations, starting Monday

## Problem Description

At Thursday's all-hands the VP of Engineering announced that from Monday any
accessibility violation fails the build. No exceptions, her words. A customer
escalation last month is behind it and she is not going to be talked out of
shipping something blocking on Monday.

Where we already are: `lib/gate.js` has two exports. `report()` mails the
nightly summary to the app owners - that mail is popular and must keep working
exactly as it does now. `check()` is the blocking check we shipped in June; the
CLI wrapper around it runs after every nightly scan and compares last night's
results against `a11y/baseline.json`. It has come back green every single night
since it went in, which everybody has read as good news.

Last night's scan is `reports/scan-2026-09-12.json`, the previous month's is
`reports/scan-2026-08-14.json` (kept for the trend email), the run log is
`reports/run-log.txt`, and the apps in the pilot are listed in
`a11y/pilot.json`. The oldest finding in any of them dates to 2023 and no team
has remediation time booked this quarter. There is a short history of the check
itself under `docs/`.

Two things landed on my desk this morning.

Support have a new complaint about the CSV export control the dashboard team
added last week. The check was green every night that week and nobody has
looked at why.

And the VP wants `billing` taken out of the pilot on the grounds that it keeps
breaking the job.

Build me what she announced, and answer both of those while you are in there.

## Output Specification

1. Change the blocking check in `lib/gate.js`, and add a CLI entry
   `scripts/a11y-gate.mjs` that exits non-zero when the check fails and zero
   when it passes.
2. Leave `report()` behaving exactly as it does now. `npm test` must stay green
   and `test/report.test.js` must not be edited.
3. Add `test/gate.test.js` proving the verdict the check gives on last night's
   data, and proving what it does when a finding appears that was not there
   before.
4. Commit whatever supporting data file the check needs alongside it.
5. Write `docs/a11y-gate.md` - the reply to the VP. What goes live Monday, what
   it will and will not stop, why the dashboard complaint got past the check,
   and your answer on removing `billing` from the pilot.
6. No new dependencies. The suite runs under `node --test`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "atlas-a11y",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: lib/gate.js ===============
import { readFileSync } from 'node:fs';

export function report(scanPath) {
  const scan = JSON.parse(readFileSync(scanPath, 'utf8'));
  const lines = scan.violations.map(
    (v) => `${v.app} ${v.url} ${v.ruleId} ${v.selector} (${v.impact})`,
  );
  for (const line of lines) console.log(line);
  console.log(`${lines.length} violations`);
  return lines;
}

export function check(scanPath, baselinePath) {
  const scan = JSON.parse(readFileSync(scanPath, 'utf8'));
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

  const known = new Set(baseline.known.map((k) => `${k.app}|${k.ruleId}`));
  const novel = scan.violations.filter((v) => !known.has(`${v.app}|${v.ruleId}`));

  return { pass: novel.length === 0, novel };
}

=============== FILE: test/report.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { report } from '../lib/gate.js';

test('report lists every violation in the scan', () => {
  const lines = report('reports/scan-2026-09-12.json');
  assert.equal(lines.length, 12);
  assert.ok(lines.some((l) => l.startsWith('settings /settings label')));
});

=============== FILE: a11y/pilot.json ===============
{
  "apps": ["checkout", "dashboard", "settings", "billing", "status"],
  "onboarded": {
    "checkout": "2026-06-02",
    "dashboard": "2026-06-02",
    "settings": "2026-06-02",
    "billing": "2026-06-02",
    "status": "2026-09-01"
  }
}

=============== FILE: a11y/baseline.json ===============
{
  "recorded": "2026-06-02",
  "known": [
    { "app": "checkout", "ruleId": "color-contrast" },
    { "app": "checkout", "ruleId": "heading-order" },
    { "app": "checkout", "ruleId": "label" },
    { "app": "checkout", "ruleId": "link-name" },
    { "app": "dashboard", "ruleId": "aria-required-attr" },
    { "app": "dashboard", "ruleId": "color-contrast" },
    { "app": "dashboard", "ruleId": "link-name" },
    { "app": "dashboard", "ruleId": "th-has-data-cells" },
    { "app": "dashboard", "ruleId": "heading-order" },
    { "app": "settings", "ruleId": "label" },
    { "app": "settings", "ruleId": "color-contrast" },
    { "app": "settings", "ruleId": "link-name" },
    { "app": "billing", "ruleId": "color-contrast" },
    { "app": "billing", "ruleId": "label" }
  ]
}

=============== FILE: docs/gate-history.md ===============
# The nightly accessibility check - history

Shipped 2026-06-02. `a11y/baseline.json` was written from that morning's scan so
the job would go green while the teams work through the backlog.

- 2026-06-02  check and baseline go in; nightly job wired to the CLI wrapper
- 2026-06-18  dashboard deletes the legacy activity widget (`a.old-widget`)
- 2026-07-02  trend email added; the previous month's scan is kept for it
- 2026-08-14  monthly scan retained for the trend email
- 2026-09-01  `status` joins the pilot
- every nightly run since 2026-06-02 has come back green

=============== FILE: reports/scan-2026-08-14.json ===============
{
  "generated": "2026-08-14T01:02:00Z",
  "apps": ["checkout", "dashboard", "settings", "billing"],
  "violations": [
    { "app": "checkout", "url": "/checkout", "ruleId": "color-contrast", "selector": "button.promo", "impact": "serious" },
    { "app": "checkout", "url": "/checkout", "ruleId": "color-contrast", "selector": ".price-strike", "impact": "serious" },
    { "app": "checkout", "url": "/checkout", "ruleId": "heading-order", "selector": "h4.summary", "impact": "moderate" },
    { "app": "checkout", "url": "/checkout/confirm", "ruleId": "label", "selector": "input#coupon", "impact": "critical" },
    { "app": "checkout", "url": "/checkout/confirm", "ruleId": "link-name", "selector": "a.terms", "impact": "serious" },
    { "app": "dashboard", "url": "/", "ruleId": "aria-required-attr", "selector": "div.tablist", "impact": "critical" },
    { "app": "dashboard", "url": "/", "ruleId": "color-contrast", "selector": "span.muted", "impact": "serious" },
    { "app": "dashboard", "url": "/reports", "ruleId": "th-has-data-cells", "selector": "table.usage", "impact": "serious" },
    { "app": "dashboard", "url": "/reports", "ruleId": "heading-order", "selector": "h3.chart-title", "impact": "moderate" },
    { "app": "settings", "url": "/settings", "ruleId": "label", "selector": "input#tz", "impact": "critical" },
    { "app": "settings", "url": "/settings", "ruleId": "color-contrast", "selector": "label.hint", "impact": "serious" },
    { "app": "settings", "url": "/settings/team", "ruleId": "link-name", "selector": "a.remove", "impact": "serious" },
    { "app": "billing", "url": "/billing", "ruleId": "color-contrast", "selector": "td.amount", "impact": "serious" },
    { "app": "billing", "url": "/billing/invoices", "ruleId": "label", "selector": "select#year", "impact": "critical" }
  ]
}

=============== FILE: reports/scan-2026-09-12.json ===============
{
  "generated": "2026-09-12T01:04:12Z",
  "apps": ["checkout", "dashboard", "settings", "status"],
  "violations": [
    { "app": "checkout", "url": "/checkout", "ruleId": "color-contrast", "selector": ".price-strike", "impact": "serious" },
    { "app": "checkout", "url": "/checkout", "ruleId": "heading-order", "selector": "h4.summary", "impact": "moderate" },
    { "app": "checkout", "url": "/checkout/confirm", "ruleId": "label", "selector": "input#coupon", "impact": "critical" },
    { "app": "checkout", "url": "/checkout/confirm", "ruleId": "link-name", "selector": "a.terms", "impact": "serious" },
    { "app": "dashboard", "url": "/", "ruleId": "aria-required-attr", "selector": "div.tablist", "impact": "critical" },
    { "app": "dashboard", "url": "/", "ruleId": "color-contrast", "selector": "span.muted", "impact": "serious" },
    { "app": "dashboard", "url": "/", "ruleId": "link-name", "selector": "a.export", "impact": "serious" },
    { "app": "dashboard", "url": "/reports", "ruleId": "th-has-data-cells", "selector": "table.usage", "impact": "serious" },
    { "app": "dashboard", "url": "/reports", "ruleId": "heading-order", "selector": "h3.chart-title", "impact": "moderate" },
    { "app": "settings", "url": "/settings", "ruleId": "label", "selector": "input#tz", "impact": "critical" },
    { "app": "settings", "url": "/settings", "ruleId": "color-contrast", "selector": "label.hint", "impact": "serious" },
    { "app": "settings", "url": "/settings/team", "ruleId": "link-name", "selector": "a.remove", "impact": "serious" }
  ]
}

=============== FILE: reports/run-log.txt ===============
2026-09-12 01:02:10  scan start  (pilot read from a11y/pilot.json)
2026-09-12 01:02:44  checkout    exit 0   4
2026-09-12 01:03:21  dashboard   exit 0   5
2026-09-12 01:03:58  settings    exit 0   3
2026-09-12 01:04:07  status      exit 0   0
2026-09-12 01:04:09  billing     exit 7   net::ERR_CONNECTION_REFUSED staging-billing.atlas.internal:8443
2026-09-12 01:04:12  scan end    12 violations written

=============== FILE: reports/merged-this-week.md ===============
# Pilot apps - merged 2026-09-08 to 2026-09-12

| PR    | App       | Title                                        | Author      |
|-------|-----------|----------------------------------------------|-------------|
| #2210 | checkout  | Raise promo button contrast to brand token 7 | @sdelacroix |
| #2214 | settings  | Copy fix on the timezone hint                | @ojafari    |
| #2218 | dashboard | Add CSV export control to the header         | @tmbeki     |
| #2221 | checkout  | Bump test fixture dates                      | @sdelacroix |
