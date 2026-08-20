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
