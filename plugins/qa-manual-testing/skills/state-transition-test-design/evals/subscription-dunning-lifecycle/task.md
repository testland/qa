# Cancelled subscriptions are coming back to life

## Problem Description

Our SaaS plans move through a billing lifecycle that has never had proper test
cases written for it. A new account starts on a 14 day trial. When the trial
ends the subscription becomes active and the first invoice is charged. An
active subscription renews monthly and keeps running as long as each renewal
is paid.

When a renewal charge fails the subscription goes past due. The gateway then
retries the same card once a day for seven days and sends another dunning
email each time the retry does not go through. A retry that does go through
puts the customer back on the active plan. A customer can also pause an active
subscription for up to three months: a paused subscription issues no invoices
at all, and support has been told never to pause an account that owes us
money. Resuming a paused subscription makes it active again.

Cancelling is available from the trial, from the active plan, from past due
and from paused. Cancelled is the end of the road for us. We do not bring
subscriptions back; the customer signs up again and gets a new one.

Two incidents last quarter are why we are asking. A gateway webhook for a
payment that had settled arrived four days after the customer cancelled, and
the subscription flipped back to active with a paid invoice attached to a
closed account. Separately, a customer clicked Resume on a cancelled
subscription from a browser tab that had been open all week and got a 500.
Neither of those is on anybody's test plan.

## Output Specification

Produce `docs/subscription-lifecycle-tests.md` containing:

1. The model you derived the cases from: for each status a subscription can
   hold, what the billing service does with each of the events it accepts.
2. Manual test cases, numbered, each a sequence of steps with the expected
   result of every step, runnable by a tester who has an admin account and a
   sandbox gateway.
3. A short statement of what you covered and what you deliberately left out.

Proration, invoice PDF contents, dunning email copy, and the gateway's own
retry scheduling are out of scope - assume the events arrive as described.
Do not write code; this is a manual pack for the QA team.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/billing-lifecycle.md ===============
# Billing lifecycle - billing-service

Owner: Billing squad. Updated by the BA after the March pricing change.

## Statuses a subscription can hold

| Status | Shown in the admin console and the customer's Account page |
|---|---|
| Trialing | "Trial - N days left". No card charged yet. |
| Active | "Active". Renews monthly. |
| PastDue | "Payment problem". Warning banner, features still enabled. |
| Paused | "Paused". Features disabled, no invoices issued. |
| Cancelled | "Cancelled". Read-only account. |

## Events billing-service accepts

| Event | Where it comes from |
|---|---|
| trial-ends | Nightly job, 02:00 UTC |
| payment-succeeds | Gateway webhook |
| payment-fails | Gateway webhook |
| pause-requested | Customer, Account > Plan, or a support agent |
| resume-requested | Customer, Account > Plan |
| cancel-requested | Customer, Account > Plan, or a support agent |

The service accepts these six and nothing else. Any of them can arrive at any
time - the gateway retries webhooks for up to 72 hours, and support agents act
on tickets that are sometimes days old.

## Rules the squad agreed

- The trial runs 14 days. The nightly job ends it and the first charge runs.
- A renewal that is paid keeps the subscription on the active plan and the
  invoice is marked paid.
- A renewal that is not paid moves the subscription to past due. The gateway
  retries daily for seven days; each retry that fails sends another dunning
  email and the customer stays where they are. A retry that is paid clears the
  problem and the customer is active again.
- Pause is offered only on the active plan and lasts at most three months.
  Nothing is invoiced while paused, so the gateway sends us nothing.
- Resume is offered only on a paused subscription.
- Cancel is offered on the trial, the active plan, past due and paused.
- Cancelled accounts keep read-only access to their data for 30 days and are
  then purged. There is no path back.

## Known gaps

The admin console shows the status but not the event history, so a tester
verifies a status change by reloading the subscription page or calling
`GET /v2/subscriptions/{id}` and reading `status`.
