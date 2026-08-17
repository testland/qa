# 38 minutes of API tests on every pull request

## Problem Description

`collections/platform.postman_collection.json` holds 214 requests in five
folders - `auth`, `orders`, `billing`, `search`, `admin`. The pull-request job
runs the whole file in one step and takes about 38 minutes wall clock, which
makes it the slowest gate we have. Developers have started merging on a green
unit-test job and hoping.

The requests are not slow individually; there are just a lot of them and they go
one after another. Our GitHub plan gives us plenty of concurrent runners - we
routinely have twenty jobs in flight - so we are paying for a serial run we do
not have to.

On the ticket, a developer wrote: "surely we just pass the parallel flag, every
runner has one - set it to 8 and this is a ten-minute fix." Nobody has checked
whether that is true, and we would rather not merge something that quietly does
nothing.

Separately: when a request in `orders` fails, the job carries on through
`search` and `admin` for another twenty minutes before reporting.

We want the pull-request gate under about ten minutes, without testing less.

## Output Specification

1. `.github/workflows/api-tests.yml`, rewritten to hit the time budget.
2. Whatever change to how the requests are stored on disk your approach needs.
   You do not have to emit 214 requests - state the file boundaries precisely
   enough that someone can do the split mechanically, and show the resulting
   layout.
3. Answer the question from the ticket directly, in two or three lines: can this
   tool run the requests of one collection concurrently within a single run, or
   not? Say which, plainly.
4. All five folders must still run on every pull request.
5. Whatever each job produces must still be retrievable per job.

Do not rewrite any assertions.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/platform.postman_collection.json ===============
{
  "info": {
    "_postman_id": "e5000000-0000-4000-8000-000000000030",
    "name": "platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "auth",
      "item": [
        {
          "name": "login",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": { "mode": "raw", "raw": "{\"user\":\"qa\",\"pass\":\"{{qaPassword}}\"}" },
            "url": { "raw": "{{baseUrl}}/v1/login", "host": ["{{baseUrl}}"], "path": ["v1", "login"] }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('login returns 200', () => pm.response.to.have.status(200));",
                  "pm.collectionVariables.set('token', pm.response.json().token);"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "orders",
      "item": [
        {
          "name": "list orders",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": { "raw": "{{baseUrl}}/v1/orders", "host": ["{{baseUrl}}"], "path": ["v1", "orders"] }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": ["pm.test('list orders returns 200', () => pm.response.to.have.status(200));"]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "billing",
      "item": [
        {
          "name": "list invoices",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": { "raw": "{{baseUrl}}/v1/invoices", "host": ["{{baseUrl}}"], "path": ["v1", "invoices"] }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": ["pm.test('list invoices returns 200', () => pm.response.to.have.status(200));"]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "search",
      "item": [
        {
          "name": "search widgets",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": {
              "raw": "{{baseUrl}}/v1/search?q=widget",
              "host": ["{{baseUrl}}"],
              "path": ["v1", "search"],
              "query": [{ "key": "q", "value": "widget" }]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": ["pm.test('search returns 200', () => pm.response.to.have.status(200));"]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "admin",
      "item": [
        {
          "name": "list users",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": { "raw": "{{baseUrl}}/v1/admin/users", "host": ["{{baseUrl}}"], "path": ["v1", "admin", "users"] }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": ["pm.test('list users returns 200', () => pm.response.to.have.status(200));"]
              }
            }
          ]
        }
      ]
    }
  ]
}

=============== FILE: .github/workflows/api-tests.yml ===============
name: api-tests

on:
  pull_request:

jobs:
  api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run collection
        run: |
          npx newman run collections/platform.postman_collection.json \
            -e environments/staging.postman_environment.json \
            -r cli,junit \
            --reporter-junit-export results.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: newman-results
          path: results.xml

=============== FILE: environments/staging.postman_environment.json ===============
{
  "id": "f6000000-0000-4000-8000-000000000031",
  "name": "staging",
  "values": [
    { "key": "baseUrl", "value": "https://staging-api.acme.io", "type": "default", "enabled": true },
    { "key": "qaPassword", "value": "", "type": "secret", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}
