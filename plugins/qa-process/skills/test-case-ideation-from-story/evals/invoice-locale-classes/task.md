# Invoice rendering is only ever checked in English and dollars

## Problem Description

BILL-905 rebuilds the customer invoice: the PDF attachment and the email that
carries it. We are shipping it to the whole customer base, which after last
year's expansion is roughly 40% outside the United States.

The current invoice test list is nine rows and every one of them uses the same
seeded customer: a US company, USD, English. It has been green throughout two
separate billing complaints — one where a Japanese customer's totals came out
with two decimal places that do not exist in their currency, and one where a
German customer's invoice showed an amount that read as a thousand times too
small to their finance team.

The story and the finance note are below. Finance will review the list, so an
expected result has to be something they can look at an invoice and check, not
a judgement call.

## Output Specification

1. Produce `docs/test-cases/BILL-905.md` containing a single markdown table.
2. Out of scope: automated tests, the tax engine's own rate tables, and the PDF
   library's performance.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/BILL-905.md ===============
# BILL-905 — Customer invoice PDF and delivery email

**Type:** Story
**Squad:** Billing

## Story

As a customer, I want to receive a correct invoice for each billing period, so
that my finance team can pay it and file it.

## Acceptance criteria

- AC-1: The invoice shows the seller details, the customer's billing name and
  address, the line items, the net total, the tax and the gross total.
- AC-2: Amounts are shown in the currency the subscription is billed in.
- AC-3: The invoice number is sequential per legal entity and never reused.
- AC-4: The invoice date and the payment due date are shown. Payment terms are
  net 14.
- AC-5: The invoice is attached to an email in the customer's chosen interface
  language and is also downloadable from the billing page.

=============== FILE: docs/BILL-905-finance-note.md ===============
# Finance note — what the invoice has to satisfy

We bill in USD, EUR, GBP, CHF and JPY. JPY has no minor unit; amounts are whole
yen and rounding happens at the line level.

Interface languages currently shipped: English, German, French, Japanese and
Arabic. Arabic customers read the invoice right-to-left. Customer billing names
and addresses are stored as the customer typed them, so a Japanese company name
can appear on an invoice whose interface language is English.

Tax handling:

- Domestic sales carry the local VAT or sales tax rate.
- EU cross-border business sales with a valid VAT number are reverse charge:
  0.00 tax, and the invoice must carry the reverse-charge statement and both
  VAT numbers.
- Customers without a VAT number are charged their local rate.
- A 0% rate and an exemption are different things and must not print the same
  label.

Due date is invoice date plus 14 days. Our legal entities are in Ireland and
Singapore, and customers are worldwide.
