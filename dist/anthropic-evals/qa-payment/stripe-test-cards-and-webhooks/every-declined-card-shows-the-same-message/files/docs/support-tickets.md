Tickets referenced, week of 2026-09-07

SUP-9912  "Your website says call my bank"
  Customer's card expired 2026-07-31. At checkout she was told to contact her
  bank for more information. She rang them, they told her the account is fine
  and the card was simply replaced. She wants to know why we did not just say
  the card had expired. Second contact from the same customer; the first was
  closed as "bank issue".

SUP-9930  "Gave up, paid with something else"
  Customer entered the wrong three digits from the back of the card. Checkout
  told him to contact his bank. He tried twice, assumed our payment page was
  broken, and completed the order through another channel at a worse rate for
  us.

RISK-441  Chargeback on ord_77120
  Declined on 2026-08-29. The dunning job retried on the 30th, 31st and the
  1st. The fourth attempt was accepted. Card was reported lost on 2026-08-27.
  Chargeback received 2026-09-05: goods gone, amount reversed, 15.00 fee.
  Risk had no record of this order before the chargeback arrived.
  The dunning job retries any order checkout returns with retryable true, and
  raises a review for any order it returns with notifyRisk true. It has never
  raised one.
