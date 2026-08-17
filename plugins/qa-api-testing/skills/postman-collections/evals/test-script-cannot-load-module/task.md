# Our webhook signature check cannot find its module in CI

## Problem Description

`collections/webhooks.postman_collection.json` has fifteen requests. Fourteen of
them are fine. The fifteenth, `verify signature`, fails in CI before it asserts
anything:

```
verify signature
  1. There was an error in evaluating the test script: Error: Cannot find module '../lib/signing'
```

The script it runs pulls in a small helper we keep at `lib/signing.js` and the
`jsonwebtoken` package, and uses them to check the HMAC header the partner sends
and the short-lived callback token in the body.

A developer added `jsonwebtoken` to `devDependencies` and re-ran the pipeline.
The error moved on to the next import and then came back. He has since tried a
relative path with `./`, an absolute path, and copying the helper next to the
collection file. None of it changed anything, and the ticket has been open for a
week with the comment "must be a path issue".

The team is not rewriting the other fourteen requests - they work, they run in
under a minute, and nobody has budget for a migration.

## Output Specification

1. State plainly why the imports fail, and whether pinning the package (or
   fixing the path) can ever make them work here. Two or three sentences.
2. Deliver a working version of the two checks currently in `verify signature` -
   the HMAC header check and the callback-token check. If one of them genuinely
   cannot be expressed where it currently lives, say which, and name a specific
   place it should live instead - specific enough that someone could act on it
   this sprint. Do not silently drop a check.
3. Whatever files change, including the secret that is currently typed into the
   script - it must not stay in the repository.
4. The other fourteen requests are out of scope and must not be rewritten,
   migrated, or reorganised.

## Input Files

Extract the following files before beginning.

=============== FILE: collections/webhooks.postman_collection.json ===============
{
  "info": {
    "_postman_id": "ff000000-0000-4000-8000-000000000070",
    "name": "webhooks",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "register webhook",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"url\":\"https://acme.io/hooks/partner\"}" },
        "url": { "raw": "{{baseUrl}}/v1/webhooks", "host": ["{{baseUrl}}"], "path": ["v1", "webhooks"] }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test('webhook registered', () => pm.response.to.have.status(201));",
              "pm.collectionVariables.set('hookId', pm.response.json().id);"
            ]
          }
        }
      ]
    },
    {
      "name": "verify signature",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"hook\":\"{{hookId}}\",\"event\":\"payout.settled\"}" },
        "url": {
          "raw": "{{baseUrl}}/v1/webhooks/{{hookId}}/replay",
          "host": ["{{baseUrl}}"],
          "path": ["v1", "webhooks", "{{hookId}}", "replay"]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "const { hmacSha256 } = require('../lib/signing');",
              "const jwt = require('jsonwebtoken');",
              "const SECRET = 'whsec_live_8fd41c0b77e94a2f';",
              "",
              "pm.test('signature header matches the body', () => {",
              "  const expected = hmacSha256(SECRET, pm.response.text());",
              "  pm.expect(pm.response.headers.get('x-acme-signature')).to.eql(expected);",
              "});",
              "",
              "pm.test('callback token is issued for our audience', () => {",
              "  const claims = jwt.verify(pm.response.json().callback_token, SECRET);",
              "  pm.expect(claims.aud).to.eql('acme-partners');",
              "});"
            ]
          }
        }
      ]
    }
  ]
}

=============== FILE: lib/signing.js ===============
const crypto = require('crypto');

function hmacSha256(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

module.exports = { hmacSha256 };

=============== FILE: package.json ===============
{
  "name": "acme-api-tests",
  "version": "1.0.0",
  "private": true,
  "devDependencies": {
    "jsonwebtoken": "^9.0.2",
    "newman": "^6.2.1"
  }
}
