# Token exchange fails three times in four and we cut over on Friday

## Problem Description

We are moving `checkout-web` (our storefront SPA) off the old dev identity
provider onto the release-candidate one before the 14 October cutover. Login
itself is fine — the user gets the consent screen, approves, and lands back on
`/auth/callback` with a code every single time. It is the exchange that breaks:
`POST /token` comes back `400 {"error":"invalid_grant"}`. Over the 200 staging
logins we captured last week it failed 148 times and succeeded 52. The IdP's
support desk says the request "does not prove possession of the verifier" and
will not say more than that, and will not share their logs. The old IdP
accepted all 200 of the same exchanges, which is why this got as far as
staging. Our four auth tests are green and have been green the whole time.

There are two branches up, both from people with more context on the deadline
than on the protocol, and I want a view on each before either lands:

- **Devin** sets `code_challenge_method` to `plain` and sends the verifier
  straight through as the challenge. One line, green every time locally and in
  staging. His argument is that the old IdP "effectively did this anyway" and
  that we can revisit after the cutover.
- **Sam** wraps the exchange in a three-attempt retry. His argument is the
  behaviour everyone has seen by hand: when it fails, you try again and it
  usually goes through on the second or third go.

I have pulled the client's auth module and an in-process stand-in for the new
IdP's two endpoints into the attached repo. The stand-in was written from their
published docs, and it reproduces the failure, so you can work against it
without staging credentials. Get this diagnosed and covered.

## Output Specification

1. Add tests under `src/` that exercise the authorize-then-exchange round trip
   against the supplied stand-in.
2. Make the exchange succeed. Do not edit `src/mockIdp.js` — it stands in for a
   third-party service we do not control.
3. Run `npm test` and record the result.
4. Write `docs/invalid-grant.md`: what was actually wrong, why it failed some
   of the time rather than all of the time, and a yes or a no with a reason on
   each of Devin's and Sam's branches.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-web-auth",
  "version": "2.4.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/pkce.js ===============
'use strict';

const crypto = require('node:crypto');

function createVerifier() {
  return crypto.randomBytes(48).toString('base64url');
}

function challengeFor(verifier) {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64').replace(/=+$/, '');
}

function authorizeParams({ clientId, redirectUri, scope, verifier }) {
  return {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    state: crypto.randomBytes(16).toString('base64url'),
    code_challenge: challengeFor(verifier),
    code_challenge_method: 'S256',
  };
}

function tokenRequestForm({ code, redirectUri, clientId, verifier }) {
  return {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  };
}

module.exports = { createVerifier, challengeFor, authorizeParams, tokenRequestForm };

=============== FILE: src/mockIdp.js ===============
'use strict';

const crypto = require('node:crypto');

// Stands in for the release-candidate IdP's authorize + token endpoints.
function createMockIdp({ clientId, redirectUri }) {
  const pending = new Map();

  function authorize(params) {
    if (params.client_id !== clientId) {
      return { status: 400, body: { error: 'unauthorized_client' } };
    }
    if (params.redirect_uri !== redirectUri) {
      return { status: 400, body: { error: 'invalid_request' } };
    }
    const code = crypto.randomBytes(12).toString('hex');
    pending.set(code, {
      challenge: params.code_challenge,
      method: params.code_challenge_method || 'plain',
    });
    return {
      status: 302,
      location: `${params.redirect_uri}?code=${code}&state=${encodeURIComponent(params.state || '')}`,
    };
  }

  function token(form) {
    if (form.grant_type !== 'authorization_code') {
      return { status: 400, body: { error: 'unsupported_grant_type' } };
    }
    const record = pending.get(form.code);
    if (!record) {
      return { status: 400, body: { error: 'invalid_grant' } };
    }
    pending.delete(form.code);

    let proven = false;
    if (record.method === 'plain') {
      proven = record.challenge === String(form.code_verifier);
    } else if (record.method === 'S256') {
      const expected = crypto
        .createHash('sha256')
        .update(String(form.code_verifier), 'ascii')
        .digest('base64url');
      proven = record.challenge === expected;
    }
    if (!proven) {
      return { status: 400, body: { error: 'invalid_grant' } };
    }

    return {
      status: 200,
      body: {
        access_token: `at_${crypto.randomBytes(8).toString('hex')}`,
        token_type: 'Bearer',
        expires_in: 900,
      },
    };
  }

  return { authorize, token };
}

module.exports = { createMockIdp };

=============== FILE: src/pkce.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerifier, challengeFor, authorizeParams } = require('./pkce');

test('the verifier is long enough to be unguessable', () => {
  const verifier = createVerifier();
  assert.ok(verifier.length >= 43);
  assert.ok(verifier.length <= 128);
});

test('a challenge is derived from the verifier', () => {
  const challenge = challengeFor(createVerifier());
  assert.equal(typeof challenge, 'string');
  assert.ok(challenge.length >= 43);
});

test('the same verifier always gives the same challenge', () => {
  const verifier = createVerifier();
  assert.equal(challengeFor(verifier), challengeFor(verifier));
});

test('the authorize request carries a challenge and a method', () => {
  const params = authorizeParams({
    clientId: 'checkout-web',
    redirectUri: 'https://checkout.example.com/auth/callback',
    scope: 'openid profile',
    verifier: createVerifier(),
  });
  assert.equal(params.response_type, 'code');
  assert.ok(params.code_challenge);
  assert.ok(params.code_challenge_method);
});

=============== FILE: docs/staging-capture.md ===============
# Staging capture, 6-10 October — checkout-web against the RC IdP

200 completed logins. Every one of them reached `/auth/callback` with a `code`.

| Outcome of POST /token | Count |
|---|---|
| 200, access token issued  | 52  |
| 400 `invalid_grant`       | 148 |

Same client build, same browser, same code path throughout. Failures are spread
evenly across the five days and across 31 distinct test users. No time-of-day
pattern, no correlation with which IdP node served the request, no correlation
with session length, and both outcomes occur for the same user within minutes
of each other. Our logs redact the verifier and the challenge, so neither value
appears in this capture.

Support desk on the failures, verbatim and in full: "the request does not prove
possession of the verifier." They would not elaborate. The previous IdP
accepted all 200 of these exchanges.

=============== FILE: docs/rc-idp-notes.md ===============
# RC IdP — what their integration page says

- Authorization code lifetime: 60 seconds, **single use**. A code is consumed
  by the first token request that presents it, whatever the outcome.
- Proof-key support: `S256` and `plain`. No configuration on our side; the
  method the client declares on the authorize request is the one applied.
- Access token lifetime: 900 seconds.
- Cutover: the old dev IdP is switched off **14 October, 18:00**.
