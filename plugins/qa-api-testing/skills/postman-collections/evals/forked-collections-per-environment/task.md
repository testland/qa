# We keep two copies of the same API tests and they have drifted

## Problem Description

We have two files of API tests that are supposed to be identical: one aimed at
our staging deployment and one aimed at a developer's local stack. They are not
identical any more. The `cancel order` request only exists in the staging copy,
and the local copy's check on `create order` was weakened months ago by someone
debugging - it now only checks the status code, where staging also checks the
returned SKU.

The reason there are two files at all is that the hostname is written into every
request, so pointing the tests somewhere else means editing every URL. Our QA
lead keeps a third copy on her laptop aimed at the live system, which is its own
problem.

Next sprint we start spinning up a per-pull-request review deployment. Its
hostname is generated at deploy time and exported to the job as `REVIEW_HOST`.
Nobody wants a fourth copy of these tests, and a hostname that is not known until
the job runs cannot be committed into a file anyway.

## Output Specification

1. One test file at `collections/orders.postman_collection.json` that runs
   unchanged against local, staging, and a review deployment.
2. Whatever per-target configuration files are needed for local and staging, in
   a form the command-line runner can consume directly.
3. The exact command to run each of the three targets, including the review
   deployment whose hostname arrives as the `REVIEW_HOST` environment variable.
4. State which files should be deleted.

Every check that exists today must still exist afterwards, at the stronger of
the two versions where the copies disagree. Do not add new checks, do not add
new requests, and do not change request methods or bodies.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/orders-staging.postman_collection.json ===============
{
  "info": {
    "_postman_id": "a1000000-0000-4000-8000-000000000001",
    "name": "orders (staging)",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "create order",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"sku\":\"WIDGET-1\",\"qty\":2}" },
        "url": {
          "raw": "https://staging-api.acme.io/v1/orders",
          "protocol": "https",
          "host": ["staging-api", "acme", "io"],
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
    },
    {
      "name": "cancel order",
      "request": {
        "method": "POST",
        "header": [],
        "url": {
          "raw": "https://staging-api.acme.io/v1/orders/1001/cancel",
          "protocol": "https",
          "host": ["staging-api", "acme", "io"],
          "path": ["v1", "orders", "1001", "cancel"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('cancel order returns 200', () => {",
              "  pm.response.to.have.status(200);",
              "});",
              "pm.test('cancel order reports state cancelled', () => {",
              "  pm.expect(pm.response.json().state).to.eql('cancelled');",
              "});"
            ]
          }
        }
      ]
    }
  ]
}

=============== FILE: collections/orders-local.postman_collection.json ===============
{
  "info": {
    "_postman_id": "a1000000-0000-4000-8000-000000000002",
    "name": "orders (local)",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "create order",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"sku\":\"WIDGET-1\",\"qty\":2}" },
        "url": {
          "raw": "http://localhost:8080/v1/orders",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8080",
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
              "});"
            ]
          }
        }
      ]
    }
  ]
}

=============== FILE: README.md ===============
# API tests

Run staging tests before every release. Run the local file if you are working
on the service on your own machine.

If you need to point the tests at a different host, open the JSON and
find-and-replace the hostname, then remember to revert it before committing.
