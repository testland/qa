# Three proposals for getting the realtime job green while the port stays blocked

## Problem Description

Three weeks ago the CI runners moved behind an egress proxy that allows 80 and
443 to an allowlist and nothing else. Our stream endpoint is `wss://` on 8443
and it is not on the allowlist. The network ticket to add it is behind a
quarter-end change freeze and the earliest realistic date is 6 October.

Since the move, the job that covers the streaming path has been red, then
`continue-on-error: true`, and since last Tuesday commented out. Nobody has
looked at a failure from it in three weeks, and in that time we have merged a
rewrite of the session-resume path.

One of our SREs has written up three changes to get coverage back. They are in
`docs/proposal.md` and I want a decision on each of them today, separately - not
a general view. Briefly:

1. Move the handshake and connection-ending checks out of the browser job and
   into the in-cluster node job, which runs as a pod next to the gateway and
   never touches the egress proxy.
2. Point the streaming coverage at `/api/poll`, our long-poll fallback, which is
   plain HTTPS on 443 and reachable from the runners today. Mark the streaming
   path covered.
3. Drop the handshake assertions altogether. The argument is that the client
   library and the browser do the handshake between them, none of it is ours,
   and it is dead weight in a suite that has to move anyway.

The three are not equally good and I do not want the same answer to all of
them. `src/upgrade.js` and `src/poll-fallback.js` are attached along with what
we currently have in `test/`, so look at what is actually in each path before
you decide rather than reasoning from the proposal text.

## Output Specification

1. Write `docs/realtime-ci-decision.md`: each of the three proposals answered
   separately, accepted or rejected, with the reason; then what the job verifies
   once your answer is applied, and what it still does not.
2. Make the changes under `test/` that your decision covers. Do not delete a
   test.
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
it and will not be before the freeze lifts. The browser e2e job cannot reach the
gateway. The in-cluster node job can - it runs as a pod in the same namespace
and talks to the service directly, no proxy in the path.

## Proposal 1 - move the protocol checks into the in-cluster job

The handshake check and the connection-ending checks do not need a browser. They
drive our own upgrade handler over the same protocol on the same port. Moving
them into the in-cluster node job gets them running again this week at no
behavioural cost. The browser job keeps the UI-level assertions it is actually
for.

## Proposal 2 - cover the streaming path through the long-poll fallback

`/api/poll` is the fallback every client already drops to when a corporate proxy
blocks the stream port. It is plain HTTPS on 443, so the runners can reach it
today with no network change at all. It carries the same events, so a suite that
polls it and asserts the events arrive gives us end-to-end coverage of realtime
delivery. I would mark the streaming path covered on that basis and revisit when
the port opens.

## Proposal 3 - drop the handshake assertions

Whatever we do with the rest, the handshake assertions should go. The browser
opens the connection and the client library speaks the protocol; the handshake
is handled for us by code we did not write and cannot break. Testing it is
testing someone else's library, and it is the fiddliest part of the suite to
move.

=============== FILE: src/upgrade.js ===============
'use strict';

const crypto = require('node:crypto');

const ACCEPT_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B12';

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

// Long-poll fallback for networks that block the stream port; own auth check, own serializer.
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
    - 'echo "disabled pending network ticket NET-4418"'

=============== FILE: reports/egress-allowlist.md ===============
# Runner egress, effective 2026-08-21

| destination                     | port | allowed |
|---------------------------------|------|---------|
| registry.internal               | 443  | yes     |
| gateway.internal (HTTPS API)    | 443  | yes     |
| gateway.internal (stream)       | 8443 | no      |
| npm registry                    | 443  | yes     |

Ticket NET-4418 requests 8443. Queued behind the change freeze; earliest
2026-10-06.

The in-cluster job is not affected - it resolves `gateway` through the cluster
service and never leaves the namespace.
