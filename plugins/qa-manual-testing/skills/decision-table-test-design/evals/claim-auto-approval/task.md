# Dario has already cut the claims grid to four rows and QA starts on it Monday

## Problem Description

Motor claim triage is being moved onto the rules engine below. Dario in claims
ops did the analysis ahead of the migration: he took the ops note, worked out
that the four things triage knows about a claim make sixteen combinations, and
reduced those to the four-row grid attached. His note explains the reduction and
it is the clearest thing anyone has written about this rule set in two years.

His argument is that the documents attached to a claim do not change where it
goes. The ops note does say photos are advisory once a human picks a claim up,
and he has extended the same reasoning to the garage estimate. Four rows instead
of sixteen is why QA can start on Monday instead of in three weeks.

Sign the grid off or reopen it, and be specific about which row. I would rather
hear on Friday that his reduction is short than hear it from a broker.

The ops note, the engine, its tests, and this quarter's reopened claims are
attached.

## Output Specification

1. Write `docs/grid-review.md`: whether the grid goes to QA as it stands, and
   for any row you reopen, what it has to be split into and on what evidence.
2. Add tests to `test/triage.test.js` that settle the question by running the
   engine rather than by argument. `npm test` must be clean.
3. List the claims QA should file, with the expected queue and service level for
   each.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "claim-triage",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: docs/claim-triage-note.md ===============
# Motor claim triage (ops note, v3)

Triage sees four things about a submitted claim: the claim amount, how long the
policy has been active, whether a damage photo is attached, and whether a repair
estimate from an approved garage is attached.

A claim of EUR 1,000 or less on a policy active for six months or more is
approved automatically when a damage photo is attached.

The same claim with no damage photo is held, and the customer is emailed to ask
for one.

Claims above EUR 1,000 go to a human adjuster.

Claims on a policy active for less than six months go to fraud review, whatever
the amount.

Damage photos are advisory once a human picks the claim up. The handler opens
the file either way.

A claim carrying an approved-garage repair estimate is closed within two working
days. Without one the customer is promised five. This service level is printed
in the policy documents and applies in both human queues.

=============== FILE: docs/dario-routing-grid.md ===============
# Claim routing grid - for QA sign-off

Sixteen combinations of the four triage inputs reduce to four rows. `-` means
the input does not change the outcome.

| row | amount <= EUR 1,000 | policy >= 6 months | photo attached | garage estimate | outcome |
|---|---|---|---|---|---|
| R1 | yes | yes | yes | - | approved automatically |
| R2 | yes | yes | no | - | held, customer emailed for a photo |
| R3 | no | yes | - | - | human adjuster |
| R4 | - | no | - | - | fraud review |

**How the reduction was done.** Two of the four inputs are attached documents,
and the note is explicit that documents do not steer a claim: "the handler opens
the file either way". So once a claim is going to a person, neither the photo nor
the garage estimate changes anything, which collapses R3 and R4 to one row each.
On the automatic path the amount and the policy age have already decided the
outcome, so the estimate is irrelevant there too.

Four rows, four claims to file. QA can be through this in a morning.

- Dario

=============== FILE: src/triage.js ===============
'use strict';

const AUTO_LIMIT_EUR = 1000;
const ESTABLISHED_MONTHS = 6;

function triage(claim) {
  const { amountEur, policyMonths, photoAttached, garageEstimateAttached } = claim;
  const serviceLevelDays = garageEstimateAttached ? 2 : 5;

  if (policyMonths < ESTABLISHED_MONTHS) {
    return { queue: 'fraud-review', serviceLevelDays };
  }
  if (amountEur > AUTO_LIMIT_EUR) {
    return { queue: 'adjuster', serviceLevelDays };
  }
  if (photoAttached) {
    return { queue: 'auto-approved', serviceLevelDays: 0 };
  }
  return { queue: 'held-for-photo', serviceLevelDays: 0 };
}

module.exports = { triage, AUTO_LIMIT_EUR, ESTABLISHED_MONTHS };

=============== FILE: test/triage.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { triage } = require('../src/triage');

test('a small photographed claim on an established policy is approved automatically', () => {
  const r = triage({ amountEur: 420, policyMonths: 30, photoAttached: true, garageEstimateAttached: false });
  assert.strictEqual(r.queue, 'auto-approved');
});

test('the same claim with no photo is held', () => {
  const r = triage({ amountEur: 420, policyMonths: 30, photoAttached: false, garageEstimateAttached: false });
  assert.strictEqual(r.queue, 'held-for-photo');
});

test('a policy under six months goes to fraud review whatever the amount', () => {
  const small = triage({ amountEur: 200, policyMonths: 2, photoAttached: true, garageEstimateAttached: false });
  const large = triage({ amountEur: 9000, policyMonths: 2, photoAttached: true, garageEstimateAttached: true });
  assert.strictEqual(small.queue, 'fraud-review');
  assert.strictEqual(large.queue, 'fraud-review');
});

=============== FILE: docs/reopened-claims.md ===============
# Reopened claims and complaints, July to August

| claim | amount | policy age | photo | garage estimate | queue | closed after |
|---|---|---|---|---|---|---|
| MC-71204 | EUR 2,400 | 14 months | yes | yes | adjuster | 2 working days |
| MC-71318 | EUR 2,600 | 11 months | yes | no | adjuster | 5 working days |
| MC-71402 | EUR 380 | 3 months | no | yes | fraud review | 2 working days |
| MC-71455 | EUR 410 | 4 months | yes | no | fraud review | 5 working days |

Two complaints this quarter are about the wait, not about the decision. Both
customers had been told two working days by the broker and got five. The service
level is contractual: it is printed in the policy documents, and the ombudsman
opened a file on MC-71318 on that basis.

MC-71204 and MC-71318 are the same kind of claim to anyone reading the routing
rules, and they were closed nine working days apart.
