# Outbound payment limits and QA accounts

App: https://qa.mobile.veldbank.example  (web build of the mobile app)

## Daily outbound limit by product tier

| Tier      | Daily outbound limit |
|-----------|----------------------|
| Standard  | 5,000.00 ZAR         |
| Premium   | 25,000.00 ZAR        |

The Youth tier was launched in June. Its daily limit is not published on this
page; the product ticket that would define it (PROD-2291) is still open and
the tier owner is Thandi M. in Retail Product.

The limit is cumulative over a calendar day in South African Standard Time
(UTC+2) and resets at 00:00 SAST. Testers outside South Africa should expect
the boundary to fall at a different local hour.

## Step-up authentication

Any outbound payment above 1,000.00 ZAR requires a one-time passcode sent to
the account's registered mobile number. In QA these are not sent to a real
handset - they appear in the message sandbox at
https://qa.mobile.veldbank.example/qa-tools/messages, usually within 60
seconds.

## New beneficiary cooling-off

A beneficiary added today cannot receive a payment for 30 minutes. All
beneficiaries listed below were added months ago and are past cooling-off.

## Seeded accounts

| Customer login          | Tier     | Available balance | Saved beneficiary        |
|-------------------------|----------|-------------------|--------------------------|
| qa.std1@veldbank.example| Standard | 48,000.00 ZAR     | "K Mahlangu - Savings"   |
| qa.prem1@veldbank.example| Premium | 190,000.00 ZAR    | "T Naidoo - Cheque"      |
| qa.youth1@veldbank.example| Youth  | 9,500.00 ZAR      | "Guardian - J Botha"     |

Passwords for all three: see vault entry `qa-mobile-customers`.

## QA tooling

The QA console (https://qa.mobile.veldbank.example/qa-tools/limits) can clear
the accumulated daily total for a single account. The reset takes effect
immediately and does not reverse payments already made.
