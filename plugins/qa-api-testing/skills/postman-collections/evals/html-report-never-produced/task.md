# The HTML report from our API job never appears

## Problem Description

Our API job asks for three kinds of output. The terminal output shows up in the
log and the XML lands where we expect it, but the HTML report has never once
been produced. The upload step ends with:

```
Warning: No files were found with the provided path: newman/report.html.
No artifacts will be uploaded.
```

The job itself is green, so this sat unnoticed for a month until a manager asked
for the pretty report. Our QA lead says the HTML report definitely used to work
on her laptop, on a machine she has since replaced, and she cannot remember
doing anything special to get it.

The XML is what our branch protection gate consumes, so that part has to keep
working exactly as it does now.

One more thing while this file is open: when the collection fails on an early
request, the job keeps going through the remaining forty-odd requests and the
log runs to about nine hundred lines. By the time you scroll to the first red
line you have lost the will.

## Output Specification

1. A fixed `.github/workflows/api-tests.yml` that produces an HTML report on
   every run and uploads it.
2. Whatever dependency change is required, in `package.json`.
3. The gate's machine-readable result must survive untouched in purpose - do not
   swap what the gate consumes.
4. Stop the run from grinding through the remaining requests after a failure.

Do not modify the collection.

## Input Files

Extract the following files before beginning.

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
          npx newman run collections/orders.postman_collection.json \
            -e environments/staging.postman_environment.json \
            -r cli,junit,html \
            --reporter-junit-export results.xml
      - name: Upload XML
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: junit
          path: results.xml
      - name: Upload HTML
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: newman/report.html

=============== FILE: package.json ===============
{
  "name": "acme-api-tests",
  "version": "1.0.0",
  "private": true,
  "devDependencies": {
    "newman": "^6.2.1"
  }
}

=============== FILE: collections/orders.postman_collection.json ===============
{
  "info": {
    "_postman_id": "cc000000-0000-4000-8000-000000000050",
    "name": "orders",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "list orders",
      "request": {
        "method": "GET",
        "header": [],
        "url": { "raw": "{{baseUrl}}/v1/orders", "host": ["{{baseUrl}}"], "path": ["v1", "orders"] }
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
