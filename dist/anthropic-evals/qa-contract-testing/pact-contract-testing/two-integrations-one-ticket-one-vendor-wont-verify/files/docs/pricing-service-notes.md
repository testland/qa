# What we know about pricing-service, from the Pricing team's README

- `POST /v1/quotes` takes `{ cart_id, currency, customer_id }`.
- Provider states are already declared in their verification harness for the
  fixtures they use in their own integration tests: `a cart with a discount
  applied`, `a cart with no discount`, `an expired cart`.
- They deploy from `main` two or three times a week and record each release.
- Their PR job runs `npm test` and a build, and takes about four minutes.
