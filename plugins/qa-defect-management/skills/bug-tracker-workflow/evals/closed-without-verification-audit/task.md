# The rule that closes a ticket when the deploy goes green

## Problem Description

Six weeks ago Tomás, who runs our releases, merged a nightly rule that closes
defects by itself. For every ticket in its query whose fix PR is merged and
whose deploy job reported success, it moves the ticket to Closed.

His argument was the audit he did first, and it is not a bad one. He read all
212 tickets we closed by hand in the previous quarter: 94% of the verification
comments on them said nothing checkable - "looks good", "merged, should be
fine" - and 31 of those comments were written by the same engineer who wrote
the fix. His conclusion was that the human confirmation step is a rubber stamp
and a green deploy is at least a signal that something real happened.

Four of the tickets the rule has closed have come back. Our support lead wrote
up what she found on each of them; that note is attached along with the rule,
its tests, and the list of everything it has closed so far.

Decide whether the rule stays, and implement what you conclude. I would rather
be told the rule is wrong now than argue about it again in November.

## Output Specification

1. Edit `automation/auto-close.js` as your decision requires. If you conclude
   the rule must not close tickets on the signal it currently uses, do not
   leave a path that does.
2. Add tests to `test/auto-close.test.js` that fail against the behaviour you
   rejected and pass against the behaviour you shipped. `npm test` must run
   clean.
3. Write `docs/closure-rule-decision.md` - the answer to Tomás: what may close
   a ticket and what may not, what his 94% figure does and does not establish,
   what happens to the tickets already closed, and what to do about the
   content-free confirmations instead.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "closure-rule",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test test/*.test.js" }
}

=============== FILE: automation/auto-close.js ===============
'use strict';

const TERMINAL = 'Closed';

function decide(ticket) {
  if (ticket.state === TERMINAL) return { action: 'none', why: 'already closed' };
  if (!ticket.pr_merged) return { action: 'none', why: 'no merged fix' };
  if (ticket.deploy_status === 'succeeded') {
    return { action: 'close', why: `deploy ${ticket.deploy_id} succeeded` };
  }
  return { action: 'none', why: 'deploy not green' };
}

// Nightly. Whatever the query returns gets decided and applied in the same pass.
function run(tickets, apply) {
  const decisions = tickets.map(decide);
  decisions.forEach((d, i) => {
    if (d.action === 'close') apply(tickets[i].key, TERMINAL, d.why);
  });
  return decisions;
}

module.exports = { decide, run, TERMINAL };

=============== FILE: test/auto-close.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { decide } = require('../automation/auto-close');

test('a ticket with no merged fix is left alone', () => {
  const d = decide({ key: 'ENG-1', state: 'Fixed', pr_merged: false, deploy_status: 'succeeded' });
  assert.strictEqual(d.action, 'none');
});

test('a ticket that is already closed is not touched again', () => {
  const d = decide({ key: 'ENG-2', state: 'Closed', pr_merged: true, deploy_status: 'succeeded' });
  assert.strictEqual(d.action, 'none');
});

=============== FILE: data/auto-closed.csv ===============
key,summary,fix_service,deploy_service,flag,flag_enabled_in_prod,confirmed_by,fix_author,returned
ENG-4101,"Session drops when switching workspaces",sessions,sessions,,,,d.novak,no
ENG-4108,"Invoice PDF missing tax line for VAT-exempt accounts",billing,billing,,,q.alvarez,s.park,no
ENG-4115,"Bulk import silently drops rows over 10k",importer,importer,import_v2,no,,m.oyelaran,yes
ENG-4120,"Webhook retries fire twice after a 502",webhooks,webhooks,,,d.novak,d.novak,no
ENG-4130,"SSO login loops for users in two directories",auth,notifications,,,,s.park,yes
ENG-4136,"Export job times out over 500k rows",reporting,reporting,,,q.alvarez,m.oyelaran,no
ENG-4140,"Password reset accepts an expired token",auth,auth,reset_v3,no,,s.park,yes
ENG-4144,"Column sort resets after inline edit",web,web,,,q.alvarez,l.fontaine,no
ENG-4151,"Duplicate charge when the payment sheet is dismissed",payments,payments,,,,r.mehta,yes

=============== FILE: docs/returned-defects.md ===============
# The four that came back - support lead's note, 2026-08-28

The rule has closed 38 tickets since 2026-07-15. Four were reported again by
customers, all within eleven days of being closed.

- **ENG-4115.** Deploy went green. The fix ships behind `import_v2`, which is
  still off in production and is scheduled for October. Nothing about the
  customer-visible behaviour changed on the day we closed it.
- **ENG-4130.** Deploy went green - for `notifications`. The fix is in `auth`,
  which had not deployed since the Tuesday before. The rule matched on the
  ticket's most recent successful deploy job, not on the service the fix
  touched.
- **ENG-4140.** Deploy went green and the fix is behind `reset_v3`, off in
  production. Same shape as ENG-4115.
- **ENG-4151.** Deploy went green and the change was live. It did not fix the
  defect - the double charge happens on a path the PR did not touch. Nobody
  tried the flow before or after.

Of the 34 that did not come back, 21 had an independent confirmation recorded
on them anyway, from someone other than the author, before the rule reached
them. The rule's contribution on those was to close a ticket that was already
confirmed.
