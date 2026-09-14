# PR #914's description is what QA works from and nobody has read it yet

## Problem Description

Our QA pair writes the regression cases for a change off the PR description, not
off the diff. By the time they get to a PR the code has usually moved on twice,
and the description is what ends up in the release note anyway. That works right
up until a sentence in the description is one nobody can turn into a check, and
then we ship and hear about it from a partner.

Dana opened #914 this morning. It is the retry work we have been promising three
partners since March and it is the first thing the pair will pick up on Monday.
I want to know, sentence by sentence, which parts of her description they can
write cases from and which parts they cannot, and for the ones they cannot, the
sentence Dana should put in instead. She will paste it straight into the PR body
herself, so give me wording, not notes. She is on a plane until Thursday, so
whatever you write has to stand on its own.

I have attached the branch as it stands so you can see the shape of what she
built.

## Output Specification

1. Write `docs/pr-914-description-review.md`: a top-line call on whether QA can
   work from this description as written, how many sentences you assessed, how
   many of them they cannot use, and a row per unusable sentence carrying what
   is wrong with it and the exact replacement text.
2. Order the rows worst first, so Dana starts at the top and can stop when her
   flight lands.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/pr-914-description.md ===============
# PR #914 — retry webhook deliveries

## What this changes

Webhook deliveries are retried on `429`, on any `5xx`, and on a `408`, up to 5
attempts in total, with full jitter applied on top of exponential backoff from
a 200ms base and a 30s cap.

Each attempt writes a `webhook.attempt` log line carrying `job_id`, `attempt`,
`status` and `delay_ms`.

When a delivery is finally given up on, the partner sees it on the deliveries
page.

Retries are switched off for partners still on the legacy plan.

Deliveries that fail all 5 attempts are written to `webhook_dead_letters` with
the status of the last response, and the backlog is drained promptly once the
partner comes back.

This should noticeably improve delivery success for our flakier partners.

## Why now

Two partners complained about duplicate deliveries during the March incident
and a third opened a ticket in April. The current sender gives up after a
single attempt, which is most of why the failure rate looks the way it does.

## Follow-ups

QA to add coverage for the retry path before this goes to staging.

=============== FILE: package.json ===============
{
  "name": "webhook-sender",
  "version": "0.4.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/backoff.js ===============
'use strict';

const DEFAULTS = { baseMs: 200, capMs: 30000, maxAttempts: 5 };

function delayFor(attempt, opts = {}) {
  const { baseMs, capMs } = { ...DEFAULTS, ...opts };
  return Math.min(baseMs * 2 ** (attempt - 1), capMs);
}

function shouldRetry(status, attempt, opts = {}) {
  const { maxAttempts } = { ...DEFAULTS, ...opts };
  if (attempt >= maxAttempts) return false;
  return status === 429 || status >= 500;
}

module.exports = { DEFAULTS, delayFor, shouldRetry };

=============== FILE: tests/backoff.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { delayFor, shouldRetry } = require('../src/backoff');

test('delay doubles with each attempt', () => {
  assert.equal(delayFor(1), 200);
  assert.equal(delayFor(2), 400);
  assert.equal(delayFor(3), 800);
});

test('delay is capped', () => {
  assert.equal(delayFor(12), 30000);
  assert.equal(delayFor(40), 30000);
});

test('the delay for a given attempt does not vary between calls', () => {
  const seen = new Set();
  for (let i = 0; i < 50; i += 1) seen.add(delayFor(4));
  assert.equal(seen.size, 1);
  assert.equal(delayFor(4), 1600);
});

test('retries on 429 and on 5xx, and not on 408 or other 4xx', () => {
  assert.equal(shouldRetry(429, 1), true);
  assert.equal(shouldRetry(500, 1), true);
  assert.equal(shouldRetry(503, 1), true);
  assert.equal(shouldRetry(408, 1), false);
  assert.equal(shouldRetry(400, 1), false);
});

test('stops at the attempt ceiling', () => {
  assert.equal(shouldRetry(503, 4), true);
  assert.equal(shouldRetry(503, 5), false);
});
