# Security scanning flagged our partner API tests

## Problem Description

A secret scanner ran over the repo last night and flagged
`collections/partners.postman_collection.json`. It contains the live partner
bearer token and the partner gateway key, both as literal strings, committed
since March. Rotation is being handled by the platform team on a separate
ticket - our job is to make sure the repo stops carrying the values.

The constraint is that the tests still have to run. In CI they run on every
merge to `main`; the platform team will put the rotated values into the repo
secrets as `PARTNER_TOKEN` and `PARTNER_GATEWAY_KEY`. Locally, developers
already export `PARTNER_TOKEN` in their shell from the company password manager,
and would like to keep doing that rather than being handed a file to fill in.

Whatever we do must not weaken what the tests check - these requests are the only
coverage we have on the partner integration.

## Output Specification

1. The cleaned `collections/partners.postman_collection.json`.
2. Any configuration files the run now needs, and any changes to
   `environments/partners.postman_environment.json`.
3. The updated `.github/workflows/partner-tests.yml`.
4. The exact command a developer runs on their laptop.
5. Two or three lines on what still has to happen outside this repo. Do not run
   git; just say what is left.

Do not change the requests, their URLs, their bodies, or their assertions.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/partners.postman_collection.json ===============
{
  "info": {
    "_postman_id": "aa000000-0000-4000-8000-000000000040",
    "name": "partners",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [{ "key": "token", "value": "ptk_live_9c1f4ab7d0e24b1c8a5f", "type": "string" }]
  },
  "item": [
    {
      "name": "list partner accounts",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-gateway-key", "value": "gwk_live_5510af2ce9b34d77" }],
        "url": {
          "raw": "{{baseUrl}}/partner/v2/accounts",
          "host": ["{{baseUrl}}"],
          "path": ["partner", "v2", "accounts"]
        }
      },
      "event": [
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
          { "key": "x-gateway-key", "value": "gwk_live_5510af2ce9b34d77" }
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

=============== FILE: environments/partners.postman_environment.json ===============
{
  "id": "bb000000-0000-4000-8000-000000000041",
  "name": "partners-sandbox",
  "values": [
    { "key": "baseUrl", "value": "https://sandbox.partners.acme.io", "type": "default", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}

=============== FILE: .github/workflows/partner-tests.yml ===============
name: partner-tests

on:
  push:
    branches: [main]

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
            -e environments/partners.postman_environment.json \
            -r cli,junit \
            --reporter-junit-export results.xml \
            --bail failure
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: partner-results
          path: results.xml
