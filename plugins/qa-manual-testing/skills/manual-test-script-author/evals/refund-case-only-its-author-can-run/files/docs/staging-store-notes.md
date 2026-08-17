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
