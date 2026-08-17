# Our API collection only ever runs on laptops

## Problem Description

We have a small API collection that somebody opens and clicks through before a
release. Twice this quarter a breaking change to `/v1/orders` merged anyway,
because nobody remembered to click through it.

We want it running on every pull request. Two things matter beyond "it runs".
First, when it goes red we want to see on the run page which individual check
failed - right now, on the rare occasion someone runs it from a terminal, all we
get is a wall of terminal output that nobody reads. Second, whatever the run
produced has to still be downloadable after a red job; on our other pipelines
the interesting output vanishes exactly when the job fails.

We deploy to staging on every merge, and ops keeps a second config around for
manual smoke checks against the live system. The API needs a bearer token; the
token for the staging service is already in the repo secrets as `API_TOKEN`.
Runners are `ubuntu-latest` with Node 20.

## Output Specification

1. `.github/workflows/api-tests.yml` - runs the collection on pull requests and
   on pushes to `main`, produces output the GitHub run page can show per check,
   and preserves the run output for download when the job is red.
2. Any change to `package.json` needed so the run does not depend on whatever a
   developer happens to have installed globally.

Do not modify the collection or either config file - they are correct as they
stand. No prose explanation is needed; the files are the deliverable.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/orders.postman_collection.json ===============
{
  "info": {
    "_postman_id": "3f1c7a90-8d2e-4c11-9a6b-2f0d51c9e001",
    "name": "orders",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "list orders",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{apiToken}}" }],
        "url": {
          "raw": "{{baseUrl}}/v1/orders?limit=5",
          "host": ["{{baseUrl}}"],
          "path": ["v1", "orders"],
          "query": [{ "key": "limit", "value": "5" }]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('list orders returns 200', () => {",
              "  pm.response.to.have.status(200);",
              "});",
              "pm.test('list orders returns an items array', () => {",
              "  pm.expect(pm.response.json()).to.have.property('items').that.is.an('array');",
              "});"
            ]
          }
        }
      ]
    },
    {
      "name": "create order",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{apiToken}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": { "mode": "raw", "raw": "{\"sku\":\"WIDGET-1\",\"qty\":2}" },
        "url": {
          "raw": "{{baseUrl}}/v1/orders",
          "host": ["{{baseUrl}}"],
          "path": ["v1", "orders"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('create order returns 201', () => {",
              "  pm.response.to.have.status(201);",
              "});",
              "pm.test('create order echoes the sku', () => {",
              "  pm.expect(pm.response.json().sku).to.eql('WIDGET-1');",
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
  "id": "b1d2e3f4-1111-4a22-9c33-5d6e7f801234",
  "name": "staging",
  "values": [
    { "key": "baseUrl", "value": "https://staging-api.acme.io", "type": "default", "enabled": true },
    { "key": "apiToken", "value": "", "type": "secret", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}

=============== FILE: environments/production.postman_environment.json ===============
{
  "id": "c9e8d7c6-2222-4b33-8d44-6e5f4a302222",
  "name": "production",
  "values": [
    { "key": "baseUrl", "value": "https://api.acme.io", "type": "default", "enabled": true },
    { "key": "apiToken", "value": "", "type": "secret", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}

=============== FILE: package.json ===============
{
  "name": "acme-api-tests",
  "version": "1.0.0",
  "private": true,
  "devDependencies": {}
}
