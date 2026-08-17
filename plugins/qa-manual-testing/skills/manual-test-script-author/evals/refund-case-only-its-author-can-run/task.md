# TC-207 can only be run by the person who wrote it

## Problem Description

Every release someone in support runs the refund regression by hand against the
staging store. The case is `scripts/TC-207-refund.md` and it has not been touched
since its author left.

Last week a new contractor was handed the case on her first day and stopped at
step 2. She had no way to know which admin login to use, which of the ~400
staging orders to open, or what to type into the amount field. She asked three
people and got three different answers. Two of them refunded different orders and
recorded a pass; the third recorded a fail because the confirmation she was
watching for never appeared, and nobody can now tell whether that was a real
defect.

The case also cannot be run twice. Whichever order it lands on is fully refunded
on the first run, so a second attempt the same afternoon errors out at the refund
step and the tester either grabs a different order at random or marks the case
blocked.

Two of the facts this case depends on are contradicted inside our own
documentation. Last release was signed off on somebody's guess about them. Do not
guess them again.

## Output Specification

Produce one markdown document at exactly `scripts/TC-207-refund-rewrite.md`
containing:

1. A rewritten refund case that a tester on day one can execute start to finish
   without asking a colleague a single question.
2. Everything that has to be true about the environment, the login and the order
   before step 1, using values that actually appear in the attached files.
3. For each action, the one thing the tester looks at to decide pass or fail.
4. Whatever is required so that running the case a second time the same afternoon
   produces the same outcome as the first.
5. A place to record a failure with enough detail for an engineer to reproduce it.
6. A short list of the points that could not be settled from the attached files,
   each written as a question for an owner. Do not close these by picking the
   more plausible answer.

Out of scope: automating the case, changing the product, and rewriting any other
case in the regression pack.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/TC-207-refund.md ===============
# TC-207 - Refund

Owner: Marek (left the company)
Last updated: 2025-06

1. Log in to the admin panel.
2. Find a recent order.
3. Open the Refunds tab.
4. Enter a valid refund amount.
5. Click Refund.
6. Check that the refund looks correct.
7. The customer should get an email.

Notes: if the Refund button is greyed out, ask in #payments.

=============== FILE: docs/staging-store-notes.md ===============
# Staging store - QA notes

Admin URL: https://staging-admin.northwind-shop.example
Build string in the admin footer at time of writing: 2026.8.3

## Admin logins (staging only)

| Login                         | Role           | Can issue a refund       |
|-------------------------------|----------------|--------------------------|
| qa.viewer@northwind.example   | Support Viewer | no                       |
| qa.support@northwind.example  | Support Agent  | no - needs approval      |
| qa.payments@northwind.example | Payments Admin | yes                      |

Passwords live in the team vault under `staging/admin-logins`.

## Seeded orders (re-seeded nightly at 01:00 UTC)

| Order    | Customer inbox              | Total  | Currency | Payment state                          |
|----------|-----------------------------|--------|----------|----------------------------------------|
| NW-40011 | qa+40011@northwind.example  | 89.90  | EUR      | captured                               |
| NW-40012 | qa+40012@northwind.example  | 149.00 | GBP      | captured                               |
| NW-40013 | qa+40013@northwind.example  | 24.50  | EUR      | authorised, not captured               |
| NW-40014 | qa+40014@northwind.example  | 310.00 | GBP      | captured, 60.00 already refunded       |
| NW-40015 | qa+40015@northwind.example  | 12.00  | EUR      | captured                               |

The Refund button is disabled on orders that are authorised but not captured.
All five orders above were captured 74 days ago.

## Currency

The refund amount field in the admin renders a bare number with no currency
symbol and no selector. Finance state that the merchant account settles in EUR.
The payments team wiki states that the refund amount is entered in the order's
own currency. Nobody has reconciled the two statements.

## Refund window

The ops runbook (`ops/refunds.md`, section 4) permits refunds up to 90 days
after capture. The customer-facing help centre says 60 days.

## Email

Staging outbound mail is captured by MailHog at
https://staging-mail.northwind-shop.example - nothing reaches a real inbox.
Delivery to MailHog is typically under a minute.
