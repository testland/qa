Last month we enabled SEPA Direct Debit and ACH Direct Debit in Checkout.
- 23 orders were shipped, and the debit failed days later. We never got paid.
- Some card orders were shipped twice: the customer's browser hit /checkout/success at
  the same moment the webhook arrived.
