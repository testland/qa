# One broken endpoint reports as eleven failures

## Problem Description

`collections/checkout.postman_collection.json` runs four requests in order. Last
week `create session` started returning 500 for an hour. The report showed
eleven failing checks across all four requests, and the on-call engineer spent
twenty minutes reading it before working out that exactly one endpoint was
broken and the other three had never had a chance.

Looking at the scripts, each request records how it went into a variable, and
the requests after it check those variables again. So a single upstream 500
manufactures a fresh failure in every downstream request, on top of the failures
those requests produce for lacking the data they needed.

The data hand-off itself is real and has to keep working: `add item`, `get
totals`, and `submit order` genuinely need the session id that `create session`
produces.

## Output Specification

Rework the four test scripts so that one broken endpoint reports as one problem:

1. A failure in `create session` must not manufacture additional failures in the
   three requests that follow it.
2. The session id must still flow from `create session` into the requests that
   need it - the collection has to remain runnable end to end.
3. Every behaviour checked today must still be checked afterwards, once, by the
   request that can actually observe it. Getting a smaller number of failures by
   checking less is not a fix.

Do not change any request's method, URL, headers, body, name, or position, and
do not add or remove requests. Deliver the rewritten collection JSON.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/checkout.postman_collection.json ===============
{
  "info": {
    "_postman_id": "c3000000-0000-4000-8000-000000000020",
    "name": "checkout",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "create session",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"customer\":\"cust_42\"}" },
        "url": { "raw": "{{baseUrl}}/v1/sessions", "host": ["{{baseUrl}}"], "path": ["v1", "sessions"] }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('session created', () => {",
              "  pm.response.to.have.status(201);",
              "});",
              "pm.environment.set('sessionOk', pm.response.code === 201 ? 'true' : 'false');",
              "pm.environment.set('sessionId', pm.response.json().id);"
            ]
          }
        }
      ]
    },
    {
      "name": "add item",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"sku\":\"WIDGET-1\",\"qty\":2}" },
        "url": {
          "raw": "{{baseUrl}}/v1/sessions/{{sessionId}}/items",
          "host": ["{{baseUrl}}"],
          "path": ["v1", "sessions", "{{sessionId}}", "items"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('upstream session was created', () => {",
              "  pm.expect(pm.environment.get('sessionOk')).to.eql('true');",
              "});",
              "pm.test('item added', () => {",
              "  pm.response.to.have.status(200);",
              "});",
              "pm.environment.set('itemAdded', pm.response.code === 200 ? 'true' : 'false');",
              "pm.environment.set('lastTotal', pm.response.json().total);"
            ]
          }
        }
      ]
    },
    {
      "name": "get totals",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/v1/sessions/{{sessionId}}/totals",
          "host": ["{{baseUrl}}"],
          "path": ["v1", "sessions", "{{sessionId}}", "totals"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('upstream session was created', () => {",
              "  pm.expect(pm.environment.get('sessionOk')).to.eql('true');",
              "});",
              "pm.test('upstream item was added', () => {",
              "  pm.expect(pm.environment.get('itemAdded')).to.eql('true');",
              "});",
              "pm.test('totals returns 200', () => {",
              "  pm.response.to.have.status(200);",
              "});",
              "pm.test('totals match the value seen when the item was added', () => {",
              "  pm.expect(pm.response.json().total).to.eql(Number(pm.environment.get('lastTotal')));",
              "});"
            ]
          }
        }
      ]
    },
    {
      "name": "submit order",
      "request": {
        "method": "POST",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/v1/sessions/{{sessionId}}/submit",
          "host": ["{{baseUrl}}"],
          "path": ["v1", "sessions", "{{sessionId}}", "submit"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('upstream session was created', () => {",
              "  pm.expect(pm.environment.get('sessionOk')).to.eql('true');",
              "});",
              "pm.test('upstream item was added', () => {",
              "  pm.expect(pm.environment.get('itemAdded')).to.eql('true');",
              "});",
              "pm.test('order submitted', () => {",
              "  pm.response.to.have.status(201);",
              "});",
              "pm.test('order is in state placed', () => {",
              "  pm.expect(pm.response.json().state).to.eql('placed');",
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
  "id": "d4000000-0000-4000-8000-000000000021",
  "name": "staging",
  "values": [
    { "key": "baseUrl", "value": "https://staging-api.acme.io", "type": "default", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}
