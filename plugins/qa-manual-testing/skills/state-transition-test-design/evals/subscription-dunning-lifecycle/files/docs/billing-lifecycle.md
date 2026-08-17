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
