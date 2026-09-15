# Owen has told the steering group billing and the network agree

## Problem Description

Billing built the charging side of the data policy and the network team built the
throttling side, eighteen months apart, and neither read the other's code. The
argument that started this was a customer on an unlimited plan roaming in Spain
past the fair-use threshold, where the two teams quote different sentences of the
same rate note at each other.

Owen from billing settled it, or says he has. He worked out that four facts about
a customer decide the outcome, built the matrix attached, ran it, and reported to
the steering group that the two implementations agree on every combination and no
code change is needed. He is closing the ticket on Friday.

His matrix is the first time anyone has written the whole rule set down and it is
the reason the argument stopped. I still want a second pair of eyes on the
finding before it goes in the minutes, because legal is on that distribution and
the resolution of the roaming case is theirs to make, not ours.

The rate note, Owen's matrix, both services, their tests and two open complaints
are attached.

## Output Specification

1. Write `docs/reconciliation-review.md`: whether Owen's finding goes in the
   minutes as it stands, and what the reconciliation actually says.
2. Add tests to `test/policy.test.js` that settle it by running both services
   rather than by reading them. `npm test` must be clean.
3. List the customers QA should set up, with what each is expected to be charged
   and what speed each is expected to get.

Out of scope: non-EU roaming, tethering and business tariffs.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "data-policy",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: docs/data-rate-note.md ===============
# Mobile data policy (rate note, consumer tariffs)

Customers on an unlimited plan are never charged for data.

Once a customer passes 100 GB within a billing cycle, connection speed is reduced
to 1 Mbit for the remainder of that cycle.

The Speed Pass add-on removes the fair-use speed reduction. It does not change
what data costs.

Data used while roaming in the EU is billed at the customer's domestic rate.

Data used while roaming in the EU above the fair-use threshold is charged at
EUR 3 per GB.

Customers not on an unlimited plan pay EUR 0.02 per MB for data used outside
their bundle allowance.

The fair-use threshold is 100 GB on every consumer tariff, unlimited or not.

=============== FILE: docs/owen-reconciliation.md ===============
# Data policy reconciliation - billing against network

Four facts decide the outcome: unlimited plan, past the 100 GB threshold, roaming
in the EU, Speed Pass held. Sixteen combinations.

Speed Pass is marked `-` throughout. The note is explicit that it "does not change
what data costs", so it cannot move the outcome and the sixteen combinations
reduce to eight.

| # | unlimited | past 100 GB | roaming EU | Speed Pass | outcome |
|---|---|---|---|---|---|
| 1 | yes | no | no | - | no charge |
| 2 | yes | yes | no | - | no charge |
| 3 | yes | no | yes | - | no charge (domestic rate) |
| 4 | yes | yes | yes | - | EUR 3 per GB above 100 |
| 5 | no | no | no | - | EUR 0.02 per MB outside bundle |
| 6 | no | yes | no | - | EUR 0.02 per MB outside bundle |
| 7 | no | no | yes | - | EUR 0.02 per MB outside bundle (domestic rate) |
| 8 | no | yes | yes | - | EUR 3 per GB above 100 |

**Finding.** I ran the billing service against all eight and it produces exactly
this column. I then read the network team's throttle rule and it keys off the same
100 GB threshold from the same tariff record. The two implementations agree on
every combination. No code change; the roaming question is answered by row 4.

- Owen

=============== FILE: src/billing.js ===============
'use strict';

const THRESHOLD_GB = 100;
const ROAMING_OVER_THRESHOLD_EUR_PER_GB = 3;
const METERED_EUR_PER_MB = 0.02;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function charge({ unlimited, usedGb, bundleGb = 0, roamingEu }) {
  if (roamingEu && usedGb > THRESHOLD_GB) {
    return { chargeEur: round2((usedGb - THRESHOLD_GB) * ROAMING_OVER_THRESHOLD_EUR_PER_GB) };
  }
  if (unlimited) return { chargeEur: 0 };
  const overBundleGb = Math.max(0, usedGb - bundleGb);
  return { chargeEur: round2(overBundleGb * 1024 * METERED_EUR_PER_MB) };
}

module.exports = { charge, THRESHOLD_GB };

=============== FILE: src/network.js ===============
'use strict';

const THRESHOLD_GB = 100;

function connection({ usedGb, speedPass }) {
  const throttled = usedGb > THRESHOLD_GB && !speedPass;
  return { throttled, speed: throttled ? '1 Mbit' : 'unrestricted' };
}

module.exports = { connection, THRESHOLD_GB };

=============== FILE: test/policy.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { charge } = require('../src/billing');
const { connection } = require('../src/network');

test('a metered customer pays for data outside the bundle', () => {
  const r = charge({ unlimited: false, usedGb: 12, bundleGb: 10, roamingEu: false });
  assert.strictEqual(r.chargeEur, 40.96);
});

test('an unlimited customer at home is not charged', () => {
  assert.strictEqual(charge({ unlimited: true, usedGb: 140, roamingEu: false }).chargeEur, 0);
});

test('past the threshold without the add-on the connection is reduced', () => {
  assert.deepStrictEqual(connection({ usedGb: 140, speedPass: false }), {
    throttled: true,
    speed: '1 Mbit',
  });
});

=============== FILE: docs/open-complaints.md ===============
# Open complaints referred from support

**T-8834.** Unlimited plan, domestic, 141 GB this cycle, no Speed Pass. "Since
the 18th I cannot load anything. I have been told repeatedly that my account
shows no charges and therefore nothing has happened to my line." Support read her
the reconciliation row for an unlimited domestic customer, which says no charge,
and closed the ticket twice. Reopened by the customer both times.

**T-8902.** Unlimited plan, roaming in Spain, 128 GB this cycle. Invoiced
EUR 84.00. The customer quotes the first line of the rate note back at us.
Referred to legal on 2026-09-02; legal have not ruled and have asked to be shown
what the note actually supports before they do.
