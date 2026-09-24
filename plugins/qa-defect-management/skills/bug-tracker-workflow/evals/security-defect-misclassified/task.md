# The rule that keeps our two classification fields in agreement

## Problem Description

Our tracker carries a damage rating and a scheduling value as two separate
fields. Two weeks ago Ines, who manages the platform team, shipped a
normalisation step that runs on every ticket write: where the damage rating is
blank it fills it from the scheduling value, and where the two disagree it
rewrites the damage rating to match.

Her case was the board audit she did first. 61% of open tickets had no damage
rating at all, and of the ones that had both, 40% disagreed - so the "critical
defects open" line in the weekly report moved for no reason anyone could
explain, and leadership stopped reading it. Since the rule went in, that number
has been stable and nobody has complained.

I am filling in a customer security questionnaire this week and I went looking
for a ticket I remembered about password-reset links leaking into a third
party's analytics. I found it in the cosmetic bucket. Attached are the rule,
its tests, what the rule's first run actually changed, and the commitment we
have already signed about how these tickets get handled.

Decide whether the normalisation stays and implement what you conclude.

## Output Specification

1. Edit `src/triage-policy.js` as your decision requires. If you conclude a
   field must not be derived from the other, do not leave a path that does it -
   including one that only fires when the field is blank.
2. Add tests to `test/triage-policy.test.js` that fail against the behaviour
   you rejected and pass against the behaviour you shipped. `npm test` must run
   clean.
3. Write `docs/classification-decision.md` - the answer to Ines: what each field
   records and what moves it, what her audit does and does not establish, what
   the stable report number is now actually counting, and the corrected values
   for every ticket the rule rewrote, with one line of basis each drawn from
   that ticket's evidence.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "triage-policy",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test test/*.test.js" }
}

=============== FILE: src/triage-policy.js ===============
'use strict';

const FROM_PRIORITY = {
  Highest: '1 - Critical',
  High: '2 - High',
  Medium: '3 - Medium',
  Low: '5 - Cosmetic',
};

function normalize(ticket) {
  const derived = FROM_PRIORITY[ticket.priority];
  if (!derived) return { ...ticket };
  if (!ticket.severity) return { ...ticket, severity: derived, severity_source: 'derived' };
  if (ticket.severity !== derived) return { ...ticket, severity: derived, severity_source: 'aligned' };
  return { ...ticket };
}

module.exports = { normalize, FROM_PRIORITY };

=============== FILE: test/triage-policy.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { normalize } = require('../src/triage-policy');

test('a ticket whose two values already agree comes back unchanged', () => {
  const t = { id: 'WEB-1', priority: 'High', severity: '2 - High' };
  assert.deepStrictEqual(normalize(t), t);
});

test('a ticket with an unrecognised scheduling value is left alone', () => {
  const t = { id: 'WEB-2', priority: 'Blocker', severity: '' };
  assert.deepStrictEqual(normalize(t), t);
});

=============== FILE: exports/normalized-diff.csv ===============
id,title,priority,severity_before,severity_after,change,evidence
WEB-512,"Password reset link is placed in the page URL and forwarded in the Referer header",Low,,5 - Cosmetic,derived,"reset tokens present in the analytics vendor's export; tokens valid 30 minutes; any vendor staff with report access can complete a reset"
WEB-519,"Session cookie loses the Secure attribute on the staging-to-prod redirect",High,,2 - High,derived,"cookie observed over plain http on the redirect hop; reproduced on 4.18.2"
WEB-528,"Data export returns rows belonging to other tenants when the filter is cleared",Highest,,1 - Critical,derived,"confirmed on staging with two seeded tenants; 1,400 rows from tenant B in tenant A's export"
WEB-531,"Checkout unavailable for all users in the EU region during peak hours",Low,1 - Critical,5 - Cosmetic,aligned,"90 minutes of total outage on the eu cluster 2026-08-11; scheduling value set to Low because it was reported by an internal user rather than a customer"
WEB-535,"App crashes on launch for Android 9 devices",Medium,1 - Critical,3 - Medium,aligned,"hard crash, no workaround, affects 2.1% of installs; Android 9 is 1.4% of revenue and leaves the support matrix in November"
WEB-546,"Tooltip arrow misaligned by 2px on the billing page",Low,5 - Cosmetic,5 - Cosmetic,none,"screenshot"

=============== FILE: docs/security-review-response.md ===============
# Signed response to the ACME security questionnaire, 2026-05-30

Extract from section 4, "Vulnerability handling", as returned to the customer.

> Reported security defects are rated for damage on intake, independently of
> when engineering schedules the work. The remediation clock is driven by that
> rating and not by the scheduling value: a defect rated at the top two damage
> bands is remediated within 72 hours of the rating being recorded, whatever
> else is in flight. The monthly evidence pack we supply lists every defect at
> those two bands opened in the period, selected on the damage rating alone.

Note from the security reviewer, 2026-08-20: the August evidence pack listed
two defects. The board had five that should have qualified.
