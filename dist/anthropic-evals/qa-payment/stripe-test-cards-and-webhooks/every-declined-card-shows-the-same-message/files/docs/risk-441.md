RISK-441 - chargeback on ord_77120

  2026-08-27  card reported lost by the cardholder
  2026-08-29  ord_77120 declined at checkout; customer shown "Your card was
              declined. Contact your bank for more information."
  2026-08-30  dunning attempt 2, declined
  2026-08-31  dunning attempt 3, declined
  2026-09-01  dunning attempt 4, accepted; goods shipped 2026-09-02
  2026-09-05  chargeback received. Amount reversed, EUR 15.00 fee, goods gone.

How the dunning job reads checkout's answer
  retryable true   -> the order is attempted again the following night, up to
                      four nights
  retryable false  -> the order is closed and the customer is emailed
  notifyRisk true  -> a review is raised for the risk queue before anything
                      else happens

  The queue has existed since March. It has never received a review from this
  service. Risk had no record of ord_77120 until the chargeback arrived.

Note from Tom, 2026-09-09
  I want to be clear that the four attempts are the part that cost us. The
  first decline was the issuer telling us not to take this card. We took it
  three more times.
