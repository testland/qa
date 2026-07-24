---
name: sidekiq-tests
description: "Authors and runs Sidekiq job tests in Ruby - three Sidekiq::Testing modes (`fake!` jobs accumulate in arrays, `inline!` runs jobs immediately, `disable!` enqueues to Redis as normal); RSpec + Minitest helper patterns; clears jobs between tests via `Sidekiq::Worker.clear_all`; assertion patterns on `MyWorker.jobs.size` and `MyWorker.jobs.first[:args]`. Use when the user works with Sidekiq workers and needs unit / integration tests for job enqueueing, scheduling, retry behavior, or unique-job semantics."
---

# sidekiq-tests

## Overview

Sidekiq is the de facto Ruby background-job framework on Redis. The
testing model per [github.com/sidekiq/sidekiq/wiki/Testing][sk-test]:

[sk-test]: https://github.com/sidekiq/sidekiq/wiki/Testing

Three test modes:

| Mode | Behavior |
|---|---|
| `Sidekiq::Testing.fake!` | "pushes all jobs into a `jobs` array" (default in test env) |
| `Sidekiq::Testing.inline!` | "run jobs inline" (executes immediately, synchronously) |
| `Sidekiq::Testing.disable!` | "Enqueue jobs to Redis as normal" |

Choose **fake!** for unit tests (assert enqueueing without execution),
**inline!** for integration tests (test the worker itself end-to-end),
**disable!** for tests that need real Redis (e.g., scheduled-job
queries against the Sidekiq API).

## When to use

- The repo has `app/workers/*.rb` (or `app/jobs/*.rb`) with Sidekiq
  classes.
- The user writes tests for job enqueueing logic (controllers /
  services).
- Tests need to assert on job count, scheduled time, or arguments.
- A test verifies retry / dead-set / unique-job behavior.

## Step 1 - Configure test mode

In `spec_helper.rb` (RSpec) or `test_helper.rb` (Minitest):

```ruby
require 'sidekiq/testing'

Sidekiq::Testing.fake!   # default for unit tests
```

Switch per-test when needed:

```ruby
it "actually runs the job" do
  Sidekiq::Testing.inline! do
    create(:order)        # triggers OrderConfirmationWorker.perform_async
    expect(...).to ...
  end
end
```

## Step 2 - Clear jobs between tests

Per [sk-test][sk-test], the Minitest helper:

```ruby
module SidekiqMinitestSupport
  def after_teardown
    Sidekiq::Worker.clear_all
    super
  end
end
```

For RSpec, equivalent:

```ruby
RSpec.configure do |config|
  config.before(:each) { Sidekiq::Worker.clear_all }
end
```

Without this, jobs accumulate across tests - order-dependent test
failures result.

## Step 3 - Assert enqueueing (fake! mode)

Per [sk-test][sk-test] (verbatim RSpec example):

```ruby
expect {
  HardWorker.perform_async(1, 2)
}.to change(HardWorker.jobs, :size).by(1)
```

Plus assertion on the basic count: `assert_equal 0, HardWorker.jobs.size`
followed by enqueueing and verifying the count changes.

Inspect job arguments + scheduled time:

```ruby
HardWorker.perform_in(1.hour, "user-123")
job = HardWorker.jobs.last
expect(job["args"]).to eq(["user-123"])
expect(job["at"]).to be_within(5.seconds).of(1.hour.from_now.to_f)
```

## Step 4 - Drain (execute) queued fake! jobs

Without leaving fake! mode, drain executes accumulated jobs:

```ruby
HardWorker.perform_async(1, 2)
HardWorker.drain   # runs all queued HardWorker jobs synchronously
```

Useful for integration tests that need fake! globally but
selectively run a worker's jobs.

## Step 5 - Test scheduled jobs

Per [sk-test][sk-test]: "Sidekiq's API does not have a testing mode" - meaning scheduled-set queries always hit Redis, not the test
harness. To test scheduled jobs in fake! mode, inspect the job's
`at` field directly (Step 3). For integration testing of the Sidekiq
scheduler API, use `Sidekiq::Testing.disable!` + a real Redis
instance (Docker / Testcontainers).

## Step 6 - Test retry behavior

Sidekiq retries failed jobs by default (25 retries, exponential
backoff). To test retry logic:

```ruby
it "retries on transient error" do
  Sidekiq::Testing.inline!
  expect_any_instance_of(HardWorker).to receive(:perform).and_raise(StandardError, "transient")
  expect { HardWorker.perform_async }.to raise_error(StandardError)
  # In production, Sidekiq would retry; in inline! mode, the raise propagates
end
```

For more realistic retry testing, switch to `disable!` + use the
Sidekiq API (`Sidekiq::RetrySet.new.size`) to count retried jobs in
Redis.

## Step 7 - Test unique-jobs semantics

If using `sidekiq-unique-jobs` gem, unique-lock state lives in Redis;
test in `disable!` mode against a real Redis instance. fake! mode
does NOT enforce uniqueness (jobs all accumulate in the array
regardless of unique config).

## Step 8 - CI integration

```yaml
- run: bundle install
- run: bundle exec rspec
# ... or for Minitest:
- run: bundle exec rake test
```

Sidekiq tests run in the standard Ruby test runner. For tests that
need real Redis, use a service container:

```yaml
services:
  redis:
    image: redis:7
    ports: [6379:6379]
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test code uses `inline!` everywhere | Slows tests; couples test to worker internals | `fake!` for enqueue tests; `inline!` only for integration |
| No `Sidekiq::Worker.clear_all` between tests | Jobs leak across tests; flaky | Add after_teardown / before(:each) hook (Step 2) |
| Test scheduled-set via `Sidekiq::ScheduledSet.new.size` in fake! mode | API hits Redis, not the fake jobs array; returns 0 unexpectedly | Inspect `Worker.jobs.last["at"]` instead (Step 3) |
| Test unique-jobs in fake! mode | Uniqueness lock isn't enforced; tests pass-by-accident | Use `disable!` + real Redis (Step 7) |

## Limitations

- Sidekiq's API queries (`ScheduledSet`, `RetrySet`, `DeadSet`) bypass
  the testing mode and always hit Redis (per [sk-test][sk-test]).
- `inline!` mode runs jobs synchronously in the calling thread - 
  hides concurrency bugs that production exhibits.
- Unique-jobs semantics need real Redis to test (Step 7).
- Sidekiq Pro / Enterprise features (batches, super-workers) have
  their own testing patterns not covered here - consult their docs.

## References

- [sk-test][sk-test] - testing modes, RSpec + Minitest examples,
  helper patterns
- github.com/sidekiq/sidekiq - repository
- `celery-tests`,
  `bullmq-tests`,
  `sqs-tests`,
  `rabbitmq-tests` - sister tools
- `idempotency-test-author`,
  `cron-job-test-author` - 
  build-an-X authors for cross-tool patterns
