# Nightly partner job either gets rate limited or hangs for six hours

## Problem Description

Our nightly job runs about sixty requests against the partner API. It fails two
different ways.

Most nights it fires requests as fast as it can and starts collecting 429s
partway through. The partner documents the limit as 10 requests per second on
their sandbox tier; we are well over that in bursts.

Maybe once a week the job does not fail at all - it just sits. One request never
comes back, nothing times out, and the job runs until GitHub kills it at the
six-hour ceiling. We burn the minutes and get no report.

Someone tried to fix the first problem in March by putting a loop at the top of a
pre-request script that spins on `Date.now()` until 1.5 seconds have passed. It
turned a four-minute run into a twenty-minute run, pins the runner CPU at 100%,
and we still get 429s, because the spin happens before one request rather than
pacing the run.

The other thing in that workflow is that it points at the live partner
environment. The comment in the commit says "sandbox kept rate limiting us". The
requests include a payout creation.

## Output Specification

1. A fixed `.github/workflows/partner-nightly.yml` in which the run's pace
   respects the documented 10 requests per second, and in which a request that
   never responds ends the run in minutes rather than hours. Show the arithmetic
   behind whatever pacing number you choose.
2. A cleaned `collections/partners.postman_collection.json` with the March
   workaround removed.
3. The run must not touch the live partner system.

Do not change any assertion, request body, or URL path.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/partner-nightly.yml ===============
name: partner-nightly

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  partners:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run partner collection
        run: |
          npx newman run collections/partners.postman_collection.json \
            -e environments/partner-production.postman_environment.json \
            -r cli,junit \
            --reporter-junit-export results.xml \
            --insecure
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: partner-results
          path: results.xml

=============== FILE: collections/partners.postman_collection.json ===============
{
  "info": {
    "_postman_id": "ab000000-0000-4000-8000-000000000080",
    "name": "partners",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "list partner accounts",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-gateway-key", "value": "{{gatewayKey}}" }],
        "url": {
          "raw": "{{baseUrl}}/partner/v2/accounts",
          "host": ["{{baseUrl}}"],
          "path": ["partner", "v2", "accounts"]
        }
      },
      "event": [
        {
          "listen": "prerequest",
          "script": {
            "type": "text/javascript",
            "exec": [
              "const started = Date.now();",
              "while (Date.now() - started < 1500) { /* wait out the rate limiter */ }"
            ]
          }
        },
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('accounts returns 200', () => pm.response.to.have.status(200));",
              "pm.test('accounts payload is a list', () => {",
              "  pm.expect(pm.response.json().accounts).to.be.an('array');",
              "});"
            ]
          }
        }
      ]
    },
    {
      "name": "create partner payout",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "x-gateway-key", "value": "{{gatewayKey}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"account\":\"acct_7\",\"amount_cents\":1500}" },
        "url": {
          "raw": "{{baseUrl}}/partner/v2/payouts",
          "host": ["{{baseUrl}}"],
          "path": ["partner", "v2", "payouts"]
        }
      },
      "event": [
        {
          "listen": "prerequest",
          "script": {
            "type": "text/javascript",
            "exec": [
              "const started = Date.now();",
              "while (Date.now() - started < 1500) { /* wait out the rate limiter */ }"
            ]
          }
        },
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('payout returns 201', () => pm.response.to.have.status(201));",
              "pm.test('payout is pending', () => {",
              "  pm.expect(pm.response.json().status).to.eql('pending');",
              "});"
            ]
          }
        }
      ]
    }
  ]
}

=============== FILE: environments/partner-sandbox.postman_environment.json ===============
{
  "id": "ac000000-0000-4000-8000-000000000081",
  "name": "partner-sandbox",
  "values": [
    { "key": "baseUrl", "value": "https://sandbox.partners.acme.io", "type": "default", "enabled": true },
    { "key": "gatewayKey", "value": "", "type": "secret", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}

=============== FILE: environments/partner-production.postman_environment.json ===============
{
  "id": "ad000000-0000-4000-8000-000000000082",
  "name": "partner-production",
  "values": [
    { "key": "baseUrl", "value": "https://api.partners.acme.io", "type": "default", "enabled": true },
    { "key": "gatewayKey", "value": "", "type": "secret", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}
