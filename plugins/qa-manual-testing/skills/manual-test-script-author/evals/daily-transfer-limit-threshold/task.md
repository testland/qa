# "Make a transfer over the daily limit" - over which limit?

## Problem Description

`qa/TC-451-transfer-limit.md` is the case that checks a customer cannot send more
than their daily outbound allowance. It is five lines long and every tester who
has run it has run a different test.

One tester used the youth account and sent 6,000; the transfer went through and
she raised a defect. Another used the same account and sent 30,000; it was
blocked and he passed the case. A third ran it from Lisbon late in the evening,
did the blocked transfer and then the allowed transfer, and both behaved
backwards from what he expected. None of them recorded which account they used.

The case is also single-use in practice. Whatever it sends counts against that
account for the rest of the day, so a tester re-running it an hour later to check
a fix finds the "allowed" transfer refused as well, and logs a second, imaginary
defect.

One of the numbers this case turns on is not documented anywhere we can find, and
the last three testers each assumed a different value for it. We would rather the
case says plainly that we do not know than have a fourth person assume.

## Output Specification

Produce one markdown document at exactly `qa/TC-451-daily-transfer-limit.md`
containing:

1. A rewritten case in which two testers in different countries running it on the
   same day get the same result.
2. Everything that has to be true about the account, the beneficiary and the
   tester's access before the first step, using values from the attached files.
3. Exact amounts to send, with their currency, and for each step the single thing
   observed that decides pass or fail.
4. Whatever is needed so the case can be re-run the same day to verify a fix.
5. A place to record failures.
6. A short list of anything that could not be established from the attached
   files, written as a question for an owner rather than resolved by choosing a
   likely value.

Out of scope: automating the case, testing inbound transfers, and any change to
the limits themselves.

## Input Files

Extract the following files before beginning.

=============== FILE: qa/TC-451-transfer-limit.md ===============
# TC-451 - Daily transfer limit

1. Log in as the test customer.
2. Go to Payments.
3. Make a transfer over the daily limit.
4. Check it is blocked.
5. Make a transfer under the limit and check it goes through.

=============== FILE: docs/limits-and-accounts.md ===============
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
