# 3.2.0 ships Thursday and the check Priya wired up says there is nothing to see

## Problem Description

`webhooks-api` has about sixty integrators on it. We publish the spec on the
developer portal and people build against what is on the portal.

3.2.0 goes to production this Thursday, 2026-09-17. Priya added
`scripts/spec-check.sh` three weeks ago and ran it against the release branch on
Monday; the output is attached and it came back with nothing. She has since
moved teams and nobody else here has looked at it closely.

I need two things, and the second one matters more to me than the first.

1. Get the comparison running in CI on every pull request that touches the spec,
   against what we actually published, so that a change like this stops being
   something one person remembers to check by hand.
2. Give me a plain yes or no on whether 3.2.0 is safe for an integrator who is
   currently running against 3.1.0. I have to forward that to the account team
   today and they will act on it.

Attached: Priya's script and the output from her Monday run, the spec as the
release branch leaves it, the copy of the 3.1.0 spec we published on the portal,
the service's route table and its tests, the release runbook, and the gateway's
per-route traffic for August.

`spec/openapi.v3.1.0.yaml` is the file we served from the portal for three
months. It is a record of what we told people and it does not get edited,
whatever it does or does not say.

## Output Specification

1. Add the CI job. It runs on pull requests touching the spec and it has to be
   capable of turning the pull request red on a change that would break an
   integrator.
2. Write `docs/release-readiness-3.2.0.md`: yes or no for integrators on 3.1.0,
   what that conclusion actually rests on, and — if the answer is no — what has
   to happen before Thursday.
3. `test/routes.test.js` passes today and must still pass. `node --test`, no
   dependencies.
4. Do not edit `spec/openapi.v3.1.0.yaml`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "webhooks-api",
  "version": "3.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "spec:check": "bash scripts/spec-check.sh"
  }
}

=============== FILE: scripts/spec-check.sh ===============
#!/usr/bin/env bash
# Compares this branch's spec against the one on the developer portal.
set -euo pipefail

PORTAL_SPEC="https://developer.northwind-webhooks.example/specs/latest/openapi.yaml"
BRANCH_SPEC="https://raw.githubusercontent.com/acme/webhooks-api/release-3.2.0/spec/openapi.yaml"

docker run --rm -t tufin/oasdiff breaking \
  --format text \
  "$PORTAL_SPEC" \
  "$BRANCH_SPEC"

=============== FILE: logs/spec-check-2026-09-15.txt ===============
npm run spec:check

> webhooks-api@3.2.0 spec:check
> bash scripts/spec-check.sh

Unable to find image 'tufin/oasdiff:latest' locally
latest: Pulling from tufin/oasdiff
Digest: sha256:9f2c1a7e0b44
Status: Downloaded newer image for tufin/oasdiff:latest
No breaking changes.

(exit status 0)

=============== FILE: docs/release-runbook.md ===============
# webhooks-api release runbook

1. Cut `release-<version>` off `main` and freeze.
2. `make publish-spec` - uploads `spec/openapi.yaml` from the release branch to
   the portal's `specs/latest/` path. We do this at branch cut so the docs team
   can start on the release notes. (The 3.2.0 branch was cut on 2026-09-11.)
3. Run the smoke suite against staging.
4. Deploy, tag, announce in #api-announce.

The portal also keeps one frozen copy per minor under `specs/v<version>/`.
`specs/latest/` is not frozen.

=============== FILE: ops/gateway-routes-2026-08.csv ===============
method,path,calls,distinct_api_keys,p50_ms
POST,/v1/webhooks,18442,54,41
GET,/v1/webhooks,206113,58,22
GET,/v1/webhooks/{webhookId},884019,59,18
DELETE,/v1/webhooks/{webhookId},12406,7,29
POST,/v1/webhooks/{webhookId}/disable,0,0,

Platform team note: the seven keys calling DELETE are Northwind Systems, Baltic
Freight, two of the Kestrel tenancies and three trial accounts that have not
called anything else since June. Northwind is the enterprise renewal in
November. Figures are August, taken off the gateway, production only.

=============== FILE: src/routes.mjs ===============
const store = new Map();
let nextId = 1;

function createWebhook(body) {
  const id = `wh_${nextId++}`;
  const record = { id, url: body.url, secret: `whsec_${id}`, disabled: false };
  store.set(id, record);
  return { status: 201, body: { id: record.id, url: record.url, secret: record.secret } };
}

function listWebhooks() {
  return { status: 200, body: [...store.values()].map((w) => ({ id: w.id, url: w.url })) };
}

function getWebhook(id) {
  const record = store.get(id);
  if (!record) return { status: 404, body: { error: 'not_found' } };
  return { status: 200, body: { id: record.id, url: record.url, disabled: record.disabled } };
}

function disableWebhook(id) {
  const record = store.get(id);
  if (!record) return { status: 404, body: { error: 'not_found' } };
  record.disabled = true;
  return { status: 200, body: { id: record.id, url: record.url, disabled: true } };
}

export const routes = [
  { method: 'POST', path: '/v1/webhooks', handler: (_id, body) => createWebhook(body) },
  { method: 'GET', path: '/v1/webhooks', handler: () => listWebhooks() },
  { method: 'GET', path: '/v1/webhooks/:id', handler: (id) => getWebhook(id) },
  { method: 'POST', path: '/v1/webhooks/:id/disable', handler: (id) => disableWebhook(id) },
];

export function handle(method, path, body = {}) {
  for (const route of routes) {
    const pattern = new RegExp(`^${route.path.replace(':id', '([^/]+)')}$`);
    const match = pattern.exec(path);
    if (match && route.method === method) return route.handler(match[1], body);
  }
  return { status: 404, body: { error: 'no_route' } };
}

export function reset() {
  store.clear();
  nextId = 1;
}

=============== FILE: test/routes.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, reset } from '../src/routes.mjs';

test('creating a webhook returns the created record with its secret', () => {
  reset();
  const res = handle('POST', '/v1/webhooks', { url: 'https://northwind.example/hooks' });
  assert.equal(res.status, 201);
  assert.equal(res.body.url, 'https://northwind.example/hooks');
  assert.match(res.body.id, /^wh_/);
  assert.match(res.body.secret, /^whsec_/);
});

test('disabling a webhook flips the flag and keeps the record', () => {
  reset();
  const created = handle('POST', '/v1/webhooks', { url: 'https://northwind.example/hooks' });
  const res = handle('POST', `/v1/webhooks/${created.body.id}/disable`, {});
  assert.equal(res.status, 200);
  assert.equal(res.body.disabled, true);
  assert.equal(handle('GET', `/v1/webhooks/${created.body.id}`).status, 200);
});

test('listing returns every webhook that was created', () => {
  reset();
  handle('POST', '/v1/webhooks', { url: 'https://a.example/hooks' });
  handle('POST', '/v1/webhooks', { url: 'https://b.example/hooks' });
  const res = handle('GET', '/v1/webhooks');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);
});

=============== FILE: spec/openapi.yaml ===============
openapi: 3.0.3
info:
  title: Webhooks API
  version: '3.2.0'
paths:
  /v1/webhooks:
    get:
      operationId: listWebhooks
      responses:
        '200':
          description: every webhook
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Webhook'
    post:
      operationId: createWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebhookRequest'
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
  /v1/webhooks/{webhookId}:
    get:
      operationId: getWebhook
      parameters:
        - name: webhookId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the webhook
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
        '404':
          description: not found
  /v1/webhooks/{webhookId}/disable:
    post:
      operationId: disableWebhook
      parameters:
        - name: webhookId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: disabled
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
        '404':
          description: not found
components:
  schemas:
    WebhookRequest:
      type: object
      required: [url]
      properties:
        url:
          type: string
    Webhook:
      type: object
      required: [id, url]
      properties:
        id:
          type: string
        url:
          type: string
        secret:
          type: string
        disabled:
          type: boolean

=============== FILE: spec/openapi.v3.1.0.yaml ===============
openapi: 3.0.3
info:
  title: Webhooks API
  version: '3.1.0'
paths:
  /v1/webhooks:
    get:
      operationId: listWebhooks
      responses:
        '200':
          description: every webhook
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Webhook'
    post:
      operationId: createWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebhookRequest'
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
  /v1/webhooks/{webhookId}:
    get:
      operationId: getWebhook
      parameters:
        - name: webhookId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the webhook
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Webhook'
        '404':
          description: not found
components:
  schemas:
    WebhookRequest:
      type: object
      required: [url]
      properties:
        url:
          type: string
    Webhook:
      type: object
      required: [id, url, secret]
      properties:
        id:
          type: string
        url:
          type: string
        secret:
          type: string
        disabled:
          type: boolean
