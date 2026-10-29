# Gateway 3DS test cards

Per-PAN test cards that drive 3DS challenge, frictionless, and bypass flows in
each gateway's test mode. Cross-referenced from [3ds-flows.md](3ds-flows.md). For
single-gateway work, prefer the gateway skills (`stripe-test-cards-and-webhooks`,
`payment-gateway-sandboxes`).

## Stripe

Per [docs.stripe.com/testing#regulatory-cards](https://docs.stripe.com/testing#regulatory-cards):

| Card | Behaviour |
|---|---|
| 4000 0027 6000 3184 | Authentication required (challenge) |
| 4000 0025 0000 3155 | Authentication required (challenge), payment failure after success |
| 4000 0000 0000 3220 | Authentication required (challenge), payment success |
| 4000 0000 0000 3055 | 3DS supported but not required (frictionless) |
| 4242 4242 4242 4242 | Standard test card (no 3DS) |

## Adyen

Per [docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers](https://docs.adyen.com/development-resources/test-cards-and-credentials/test-card-numbers):

| Card | Behaviour |
|---|---|
| 4917 6100 0000 0000 | 3DS 2 challenge flow |
| 5454 5454 5454 5454 | 3DS 2 frictionless |
| 4012 8888 8888 1881 | 3DS 1 (deprecated; for migration testing) |

## Braintree

Per [developer.paypal.com/braintree/docs/guides/3d-secure/testing/node](https://developer.paypal.com/braintree/docs/guides/3d-secure/testing/node):

| Card | Behaviour |
|---|---|
| 4000 0000 0000 1091 | Authenticate via standard flow |
| 4000 0000 0000 1109 | Frictionless |
| 4000 0000 0000 1125 | Bypass (skipped) |
