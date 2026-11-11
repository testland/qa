---
description: Short prompt that should load serverless-integration-test-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have this serverless.yml with no tests. Plan the integration tests.

```yaml
functions:
  createOrder: { handler: orders.create, events: [{ http: { path: orders, method: post } }] }
  onUpload: { handler: files.onUpload, events: [{ s3: { bucket: uploads, event: 's3:ObjectCreated:*' } }] }
  nightly: { handler: jobs.nightly, events: [{ schedule: 'cron(0 2 * * ? *)' }] }
```
