Repository secrets, payments-related

  STRIPE_API_KEY               sk_live_51Jq...   deploy workflow registers
                                                 endpoints after a release;
                                                 rotated quarterly by
                                                 @finance-eng
  STRIPE_TEST_API_KEY          sk_test_51Jq...   added 2026-03, nothing reads
                                                 it yet
  STRIPE_WEBHOOK_SECRET        whsec_...         endpoint we_1Pf9QxKJ8mXqL0ab,
                                                 https://api.ourdomain.com/webhooks/stripe
  STRIPE_TEST_WEBHOOK_SECRET   whsec_...         endpoint we_1Pg2RtKJ8mXqL0ab,
                                                 https://staging.ourdomain.com/webhooks/stripe
