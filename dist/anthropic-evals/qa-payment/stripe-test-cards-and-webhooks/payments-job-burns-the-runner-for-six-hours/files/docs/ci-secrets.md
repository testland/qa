Repository secrets, payments-related

STRIPE_API_KEY
  Live secret key, sk_live_51J... Used by the deploy workflow to register
  webhook endpoints after a release. Rotated quarterly by @finance-eng.

STRIPE_TEST_API_KEY
  Test-mode secret key, sk_test_51J... Nothing uses it at the moment.

STRIPE_WEBHOOK_SECRET
  Signing secret of the registered live endpoint
  (https://api.ourdomain.com/webhooks/stripe), whsec_... Used by production.

STRIPE_TEST_WEBHOOK_SECRET
  Signing secret of the registered test-mode endpoint
  (https://staging.ourdomain.com/webhooks/stripe), whsec_...
