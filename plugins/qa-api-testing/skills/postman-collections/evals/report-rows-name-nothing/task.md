# Our CI test report has three rows and none of them say anything

## Problem Description

The billing collection runs three requests and checks about a dozen things
between them, but the report our CI publishes has exactly three rows, all called
`tests`. When billing broke on Tuesday the report said `tests` failed and
nothing else, so everyone went to the raw log anyway.

Two more things we noticed while digging:

In `list invoices`, the invoice-count check at the top of the script blew up
because the payload came back empty. Everything below it in that script produced
no result at all - not a pass, not a fail, the rows simply were not in the
report. We only found out those checks had not run by adding print statements.

In the same request, a couple of "checks" turn out to be print statements with an
`if` around them. They have never failed anything; they just write a line into
the log that nobody reads.

## Output Specification

Rewrite the test scripts of the three requests so that:

1. The report names, per request, exactly which behaviour failed - a person
   reading the CI summary should not need the raw log to know what broke.
2. Every check currently performed is still enforced, including the ones
   currently written as print statements, and a failure early in a script does
   not stop the rest of that script's checks from being reported.

Do not change any request's method, URL, headers, body, name, or order, and do
not add or remove requests. Deliver the rewritten collection JSON.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/billing.postman_collection.json ===============
{
  "info": {
    "_postman_id": "dd000000-0000-4000-8000-000000000060",
    "name": "billing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
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
              "pm.test('tests', function () {",
              "  pm.response.to.have.status(200);",
              "  const body = pm.response.json();",
              "  pm.expect(body.token).to.be.a('string');",
              "  pm.expect(body.expires_in).to.eql(3600);",
              "  pm.expect(pm.response.responseTime).to.be.below(800);",
              "});",
              "pm.environment.set('loginOk', pm.response.code === 200 ? 'true' : 'false');",
              "pm.collectionVariables.set('token', pm.response.json().token);"
            ]
          }
        }
      ]
    },
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
            "exec": [
              "pm.expect(pm.response.json().invoices.length).to.eql(3);",
              "pm.test('tests', function () {",
              "  pm.response.to.have.status(200);",
              "  pm.expect(pm.response.headers.get('content-type')).to.include('application/json');",
              "  pm.expect(pm.response.json().invoices[0]).to.have.property('id');",
              "});",
              "if (pm.response.json().invoices[0].currency !== 'EUR') {",
              "  console.log('WARNING: first invoice is not in EUR');",
              "}",
              "if (pm.response.json().page_size !== 25) {",
              "  console.log('WARNING: unexpected page size');",
              "}"
            ]
          }
        }
      ]
    },
    {
      "name": "pay invoice",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"invoice\":\"inv_1\",\"method\":\"card\"}" },
        "url": { "raw": "{{baseUrl}}/v1/payments", "host": ["{{baseUrl}}"], "path": ["v1", "payments"] }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('tests', function () {",
              "  pm.expect(pm.environment.get('loginOk')).to.eql('true');",
              "  pm.response.to.have.status(201);",
              "  const body = pm.response.json();",
              "  pm.expect(body.state).to.eql('captured');",
              "  pm.expect(body.amount_cents).to.eql(4500);",
              "});"
            ]
          }
        }
      ]
    }
  ]
}

=============== FILE: environments/staging.postman_environment.json ===============
{
  "id": "ee000000-0000-4000-8000-000000000061",
  "name": "staging",
  "values": [
    { "key": "baseUrl", "value": "https://staging-api.acme.io", "type": "default", "enabled": true },
    { "key": "qaPassword", "value": "", "type": "secret", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}
