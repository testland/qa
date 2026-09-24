# Three ways to get the realtime job running again while 8443 stays blocked

## Problem Description

Three weeks ago the CI runners moved behind an egress proxy that allows 80 and
443 to an allowlist and nothing else. Our stream endpoint is `wss://` on 8443
and it is not on the allowlist. The network ticket to add it is behind a
quarter-end change freeze and the earliest realistic date is 6 October.

Since the move, the job that covers the streaming path went red, then
`continue-on-error: true`, and since last Tuesday it has been commented out.
Nobody has looked at a failure from it in three weeks, and in that time we
merged a rewrite of the session-resume path.

@npatel on the SRE side has written up three changes that would get coverage
back before the freeze lifts. They are in `docs/proposal.md`. I want a verdict
on each one with the reason, and then the changes applied.

`src/upgrade.js` is our own upgrade handler and `src/poll-fallback.js` is the
long-poll endpoint; `test/` is everything we currently run. `reports/` has the
egress table, the route map for the edge, and our open tickets against it.

## Output Specification

1. Write `docs/realtime-ci-decision.md`: a verdict on each of the three
   proposals with the reason, then what the job verifies once your answer is
   applied and what it still does not.
2. Apply the changes your verdict covers under `src/` and `test/`. Do not
   delete, skip or weaken an existing test.
3. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "stream-edge",
  "version": "1.9.4",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/proposal.md ===============
# Getting realtime coverage back before 6 October

Author: @npatel (SRE)  ·  2026-09-11

## Context

Runner egress is 80/443 to an allowlist. `wss://gateway.internal:8443` is not on
it and will not be before the freeze lifts. The browser e2e job runs on the
shared runner pool and cannot reach the gateway. The in-cluster node job can -
it runs as a pod in the same namespace and talks to the service directly.

## Proposal 1 - move the protocol checks into the in-cluster job

The handshake check and the connection-ending checks do not need a browser. They
drive our own upgrade handler directly. Moving them into the in-cluster node job
gets them running again this week at no behavioural cost, and the browser job
keeps the UI-level assertions it is actually for.

## Proposal 2 - cover the streaming path through the long-poll fallback

`/api/poll` is the fallback every client already drops to when a corporate proxy
blocks the stream port. It is plain HTTPS on 443, so the runners can reach it
today with no network change at all. It carries the same events, so a suite that
polls it and asserts the events arrive gives us end-to-end coverage of realtime
delivery. I would mark the streaming path covered on that basis and revisit when
the port opens.

## Proposal 3 - point the browser job at the HTTP/2 endpoint on 443

The gateway already answers `/stream` on 443 as well, and 443 is allowed from
the runner pool today. Repointing `tests-e2e/realtime.spec.ts` at
`wss://gateway.internal/stream` gets the browser job running this afternoon with
no network ticket at all - same gateway, same session code, same events. When
8443 opens we can point it back, or leave it where it is.

=============== FILE: src/upgrade.js ===============
'use strict';

const crypto = require('node:crypto');

const ACCEPT_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(key) {
  return crypto.createHash('sha1').update(key + ACCEPT_GUID).digest('base64');
}

function handleUpgrade(request) {
  const headers = request.headers || {};

  if (String(headers.upgrade || '').toLowerCase() !== 'websocket') {
    return { status: 400, headers: {}, body: 'expected an upgrade request' };
  }

  return {
    status: 101,
    headers: {
      upgrade: 'websocket',
      connection: 'Upgrade',
      'sec-websocket-accept': acceptKey(headers['sec-websocket-key'] || ''),
    },
  };
}

module.exports = { handleUpgrade, acceptKey, ACCEPT_GUID };

=============== FILE: src/poll-fallback.js ===============
'use strict';

function handlePoll(request, queue) {
  const token = String((request.headers || {}).authorization || '').replace(/^Bearer /, '');

  if (!token) {
    return { status: 401, headers: {}, body: '' };
  }

  const events = queue.drain(token);

  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      events: events.map((event) => ({ type: event.type, data: event.payload })),
    }),
  };
}

module.exports = { handlePoll };

=============== FILE: test/upgrade.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleUpgrade } = require('../src/upgrade');

test('answers 101 to a well-formed upgrade request', () => {
  const response = handleUpgrade({
    method: 'GET',
    httpVersion: '1.1',
    headers: {
      upgrade: 'websocket',
      connection: 'Upgrade',
      'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'sec-websocket-version': '13',
    },
  });

  assert.equal(response.status, 101);
  assert.ok(response.headers['sec-websocket-accept']);
});

test('refuses a request that is not an upgrade', () => {
  const response = handleUpgrade({ method: 'GET', httpVersion: '1.1', headers: {} });

  assert.equal(response.status, 400);
});

=============== FILE: test/poll.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handlePoll } = require('../src/poll-fallback');

test('refuses an unauthenticated poll', () => {
  const response = handlePoll({ headers: {} }, { drain: () => [] });

  assert.equal(response.status, 401);
});

test('drains the queue for the caller', () => {
  const response = handlePoll(
    { headers: { authorization: 'Bearer t_9' } },
    { drain: () => [{ type: 'message', payload: { id: 1, body: 'hi' } }] },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), {
    events: [{ type: 'message', data: { id: 1, body: 'hi' } }],
  });
});

=============== FILE: ci/realtime.yml ===============
# in-cluster job - runs as a pod in the gateway namespace, no egress proxy
realtime-protocol:
  image: node:22
  script:
    - npm ci
    - npm test

# browser job - runs on the shared runner pool, behind the egress proxy
realtime-e2e:
  image: mcr.microsoft.com/playwright:v1.49.0
  # disabled 2026-09-02: wss://gateway.internal:8443 unreachable from runners
  # continue-on-error: true    # 2026-08-21 .. 2026-09-02
  # script:
  #   - npx playwright test tests-e2e/realtime.spec.ts
  script:
    - echo "disabled pending network ticket NET-4418"

=============== FILE: reports/egress-allowlist.md ===============
# Runner egress, effective 2026-08-21

| destination                     | port | allowed |
|---------------------------------|------|---------|
| registry.internal               | 443  | yes     |
| gateway.internal                | 443  | yes     |
| gateway.internal                | 8443 | no      |
| npm registry                    | 443  | yes     |

Ticket NET-4418 requests 8443. Queued behind the change freeze; earliest
2026-10-06. In-cluster pods resolve `gateway` through the cluster service and
their traffic does not pass the proxy.

=============== FILE: reports/edge-routes.md ===============
# Stream edge, as deployed 2026-08-04

| path        | port | listener transport | module               |
|-------------|------|--------------------|----------------------|
| /stream     | 8443 | HTTP/1.1           | src/upgrade.js       |
| /stream     |  443 | HTTP/2             | src/stream-h2.js     |
| /api/poll   |  443 | HTTP/1.1           | src/poll-fallback.js |

The 443 listener negotiates h2 over ALPN and does not downgrade. Both /stream
routes reach the same session and frame code once a connection is established;
they do not share the code that establishes one.

=============== FILE: reports/open-incidents.md ===============
# Open tickets against the stream edge, 2026-09-12

| id       | opened     | summary                                                     | state  |
|----------|------------|-------------------------------------------------------------|--------|
| NET-4418 | 2026-08-21 | allow 8443 outbound from the shared runner pool              | queued |
| SUP-2210 | 2026-06-02 | kiosk build 1.2 - embedded webview, ships an older handshake than our current clients - gets 101 back from :8443 and then holds a socket that never delivers a frame; reproduced twice on hardware, no diagnosis | open |
| SUP-2377 | 2026-08-30 | a customer proxy strips `upgrade`, client drops to /api/poll | closed |
| SUP-2404 | 2026-09-08 | duplicate presence rows after session resume, reported twice | open   |
