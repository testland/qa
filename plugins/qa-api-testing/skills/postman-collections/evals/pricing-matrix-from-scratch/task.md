# Finance handed us 40 markets and we have no pricing tests at all

## Problem Description

Our price endpoint returns a currency and a tax treatment per country. It has
never had automated coverage - we found out it was returning USD for Canadian
customers when a customer told us.

Finance owns the market list. They have a spreadsheet with 40 country rows and
it grows every quarter as we open markets. Their ask is that they can hand over
an updated list and have it take effect without an engineer editing test code,
and without a 40-request JSON file going through code review.

Our other API tests are collections that CI runs from the command line - see the
orders collection for how we lay them out and how we get the host and the API
key in. The pricing job gets one step in the pipeline and about five minutes. We
are not adding a pipeline step per country, and we are not writing a script that
launches the runner over and over.

When a market breaks, whoever is triaging has to be able to see which market
from the report.

## Endpoint Contract

`POST {{baseUrl}}/v1/price`, header `x-api-key`, body:

```json
{ "country": "DE", "sku": "WIDGET-1" }
```

Responds `200` with:

```json
{ "currency": "EUR", "tax_inclusive": true, "amount_cents": 4500 }
```

## Output Specification

1. `collections/pricing.postman_collection.json`, covering all 40 countries
   without holding 40 requests, checking the status code, the currency, and the
   tax treatment for each market.
2. Whatever file or files carry the market list, in a form finance can keep
   maintaining. Populate it with the five rows given below; the other 35 follow
   the same shape and do not need writing out.
3. The single command CI runs to cover every market.

Follow the existing collection's conventions for the host and the API key. Do
not modify `collections/orders.postman_collection.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/orders.postman_collection.json ===============
{
  "info": {
    "_postman_id": "b2000000-0000-4000-8000-000000000010",
    "name": "orders",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "list orders",
      "request": {
        "method": "GET",
        "header": [{ "key": "x-api-key", "value": "{{apiKey}}" }],
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
              "pm.test('list orders returns 200', () => pm.response.to.have.status(200));",
              "pm.test('list orders returns an items array', () => {",
              "  pm.expect(pm.response.json().items).to.be.an('array');",
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
  "id": "b3000000-0000-4000-8000-000000000011",
  "name": "staging",
  "values": [
    { "key": "baseUrl", "value": "https://staging-api.acme.io", "type": "default", "enabled": true },
    { "key": "apiKey", "value": "", "type": "secret", "enabled": true }
  ],
  "_postman_variable_scope": "environment"
}

=============== FILE: docs/pricing-matrix.md ===============
# Pricing matrix (owner: finance)

The first five rows of the 40-row sheet. Columns are country code, expected
currency, and whether quoted prices include tax.

| country | currency | tax inclusive |
|---------|----------|---------------|
| DE      | EUR      | yes           |
| US      | USD      | no            |
| JP      | JPY      | yes           |
| GB      | GBP      | yes           |
| CA      | CAD      | no            |
