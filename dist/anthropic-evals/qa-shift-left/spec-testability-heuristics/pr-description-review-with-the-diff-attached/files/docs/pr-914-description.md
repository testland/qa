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
