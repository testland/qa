These tests are supposed to prove trial conversion, monthly renewals and dunning work
against the real Stripe sandbox. The first two always fail and the third errors when the
customer is created. Our webhook handler (not shown) listens for invoice.paid,
invoice.payment_failed and customer.subscription.updated.
