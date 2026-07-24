---
name: celery-tests
description: "Authors and runs Celery task tests in Python - `pytest-celery` fixtures (`celery_app`, `celery_worker` per-test, `celery_session_worker` per-session); `task_always_eager` config NOT recommended for unit tests; `apply()` for synchronous test invocation; mock-and-patch retry patterns via `unittest.mock.patch` on `task.retry`. Use when the user works with Celery task workers and needs unit / integration tests across function-style or class-style tasks."
---

# celery-tests

## Overview

Per [docs.celeryq.dev/en/stable/userguide/testing.html][cel-test]:

[cel-test]: https://docs.celeryq.dev/en/stable/userguide/testing.html

> "Testing with Celery is divided into two parts: Unit & Integration:
> Using `celery.contrib.pytest`. Smoke / Production: Using
> [pytest-celery](https://pypi.org/project/pytest-celery/) >= 1.0.0"

The test model uses pytest fixtures from the `celery.contrib.pytest`
plugin (or the standalone `pytest-celery` package for newer versions).

## When to use

- The repo has Celery task definitions (`@app.task` or
  `@shared_task`).
- The user writes unit tests for the task body (no need for a real
  worker).
- The user writes integration tests that require a real Celery
  worker thread.
- A test verifies retry / chord / chain semantics.

## Step 1 - Don't rely on `task_always_eager` for unit tests

Per [cel-test][cel-test]:

> "The eager mode enabled by the [task_always_eager] setting is by
> definition not suitable for unit tests."

Reason (per [cel-test][cel-test]): "eagerly executed tasks don't
write results to backend by default."

For unit tests, prefer to call the task function directly (test the
logic) and mock the dispatch where queue interaction matters.

## Step 2 - Direct task-function unit tests

Test the task function as if it were a regular function:

```python
from proj.tasks import send_order
from decimal import Decimal

def test_send_order_calls_product_order():
    product = Product.objects.create(name='Foo')
    send_order(product.pk, 3, Decimal('30.30'))
    # Assert side effects (DB row, external call, etc.)
```

This bypasses Celery's dispatch entirely - fastest, most direct.

## Step 3 - Mock retry behavior

Per [cel-test][cel-test] (verbatim retry-test pattern):

```python
from pytest import raises
from celery.exceptions import Retry
from unittest.mock import patch
from proj.models import Product
from proj.tasks import send_order

class test_send_order:
    @patch('proj.tasks.Product.order')
    def test_success(self, product_order):
        product = Product.objects.create(name='Foo')
        send_order(product.pk, 3, Decimal(30.3))
        product_order.assert_called_with(3, Decimal(30.3))

    @patch('proj.tasks.send_order.retry')
    def test_failure(self, send_order_retry, product_order):
        send_order_retry.side_effect = Retry()
        product_order.side_effect = OperationalError()
        with raises(Retry):
            send_order(product.pk, 3, Decimal(30.6))
```

Patch `<task>.retry` to assert the task triggers a retry; patch the
side-effect dependency to control failure mode.

## Step 4 - pytest-celery fixtures (integration tests)

Per [cel-test][cel-test], the canonical pytest-celery fixtures:

| Fixture | Use |
|---|---|
| `celery_app` | "This fixture returns a Celery app you can use for testing." |
| `celery_worker` | "This fixture starts a Celery worker instance that you can use for integration tests. The worker will be started in a _separate thread_." |
| `celery_session_worker` | "This fixture starts a worker that lives throughout the testing session (it won't be started/stopped for every test)." |

Choose `celery_worker` for tests that need clean worker state per
test; `celery_session_worker` for fast suites where the worker can
be reused.

```python
def test_task_runs_via_real_worker(celery_app, celery_worker):
    @celery_app.task
    def add(x, y):
        return x + y

    result = add.delay(2, 3)
    assert result.get(timeout=10) == 5
```

## Step 5 - apply() for synchronous test invocation

When you want to invoke the task synchronously without spawning a
worker:

```python
from proj.tasks import send_order

result = send_order.apply(args=[product_id, qty, amount])
assert result.successful()
assert result.result == expected_value
```

`apply()` runs the task in-process; `delay()` enqueues for a worker.
For tests, prefer `apply()` (no Redis / RabbitMQ dependency) unless
testing the dispatch path itself.

## Step 6 - Test chord / chain / group

Celery's primitives compose:

```python
from celery import chain, group, chord

# Chain: A -> B -> C
chain(task_a.s(1), task_b.s(), task_c.s())()

# Group: parallel execution
group(task_a.s(i) for i in range(3))()

# Chord: parallel group + callback
chord([task_a.s(i) for i in range(3)])(callback.s())
```

For unit tests, mock the primitives at boundaries; for integration
tests, use `celery_worker` fixture (Step 4) - primitives execute
end-to-end.

## Step 7 - CI integration

```yaml
- run: pip install -r requirements-dev.txt   # includes pytest, celery, pytest-celery
- run: pytest -v
```

For tests requiring real broker (RabbitMQ / Redis):

```yaml
services:
  redis: { image: redis:7, ports: [6379:6379] }
  # or rabbitmq:
  rabbitmq: { image: rabbitmq:3-management, ports: [5672:5672, 15672:15672] }
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `task_always_eager = True` for unit tests | Per [cel-test][cel-test], "not suitable for unit tests"; results don't write to backend | Direct function call (Step 2) or `apply()` (Step 5) |
| Use `delay()` in tests without a real worker | Tasks enqueue but never execute; tests hang or never assert | Use `apply()` for sync; `celery_worker` fixture for real-worker integration |
| Skip patching the broker side-effect | Tests hit real broker / DB | `unittest.mock.patch` the boundary (Step 3) |
| Reuse `celery_session_worker` for tests with conflicting task definitions | Worker has stale task registry; later tests fail | Use `celery_worker` for changing-registry tests; `celery_session_worker` for stable |

## Limitations

- Worker-thread fixtures slow tests substantially vs direct function
  calls - use them only when integration matters.
- `result.get(timeout=N)` with too-short N causes intermittent
  CI failures on slow runners; pick generous timeouts.
- pytest-celery v1.0+ has a different API than legacy `celery.contrib.pytest`;
  pin one and stick with it per project.

## References

- [cel-test][cel-test] - official testing guide, fixtures, retry
  patterns, eager-mode warning
- docs.celeryq.dev - full Celery documentation
- pypi.org/project/pytest-celery - pytest-celery package
- `sidekiq-tests`,
  `bullmq-tests`,
  `sqs-tests`,
  `rabbitmq-tests` - sister tools
- `idempotency-test-author`,
  `cron-job-test-author` - build-an-X authors
