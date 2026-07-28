---
name: sqs-tests
description: "Tests AWS SQS queue interactions - Standard (at-least-once delivery, near-unlimited throughput) vs FIFO (exactly-once processing, ordered) queue semantics; visibility-timeout interaction model; dead-letter queue (DLQ) for poison-message isolation; message retention period (default 4 days, configurable 60s - 1209600s); test patterns via LocalStack or `aws-sdk-client-mock` (TypeScript) / `moto` (Python). Use when the user works with AWS SQS producers/consumers and needs unit/integration tests for queue interactions."
---

# sqs-tests

## Overview

[sqs-dg]: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html

Two queue types, per [the SQS developer guide][sqs-dg]:

| Type | Delivery semantics |
|---|---|
| **Standard** | "at-least-once message delivery" |
| **FIFO** | "exactly-once message processing" + "high-throughput" mode |

The semantic difference cascades through every test pattern: a
Standard-queue test must assume duplicates can occur; a FIFO test
must assume strict ordering.

## When to use

- The repo has SQS-publishing or SQS-consuming code (AWS SDK).
- The user writes unit tests against mocked SQS clients.
- The user writes integration tests against LocalStack / real SQS
  (in a sandbox account).
- A test verifies visibility-timeout, DLQ-routing, or
  long-polling behavior.

## Step 1 - Test approach: mock vs LocalStack vs real

Three approaches, ordered by isolation:

| Approach | Pros | Cons |
|---|---|---|
| `aws-sdk-client-mock` (TS) / `moto` (Python) | Pure unit, no network | Doesn't catch AWS-side behavior (visibility timeouts, DLQ routing) |
| LocalStack (Docker SQS emulator) | Full SQS semantics locally | Slower; not 100% behavior parity with AWS SQS |
| Real SQS in sandbox AWS account | Highest fidelity | Costs money; per-PR queue cleanup needed |

For pure logic tests (does the code call SendMessage with the right
body?), use mocks. For semantic tests (does retry-on-failure work
end-to-end?), use LocalStack. For pre-prod smoke, use real SQS.

## Step 2 - Mock-based unit test (TypeScript)

```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsMock = mockClient(SQSClient);
beforeEach(() => sqsMock.reset());

it('sends order-placed message to SQS', async () => {
  sqsMock.on(SendMessageCommand).resolves({ MessageId: 'msg-123' });

  await placeOrder({ customerId: 1 });

  expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(1);
  expect(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input).toMatchObject({
    QueueUrl: expect.stringContaining('orders'),
    MessageBody: expect.stringContaining('"customerId":1'),
  });
});
```

## Step 3 - Mock-based unit test (Python)

```python
import boto3
from moto import mock_aws

@mock_aws
def test_send_order_message():
    sqs = boto3.client('sqs', region_name='us-east-1')
    queue_url = sqs.create_queue(QueueName='orders')['QueueUrl']

    place_order(customer_id=1)

    response = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=10)
    assert len(response['Messages']) == 1
    body = json.loads(response['Messages'][0]['Body'])
    assert body['customerId'] == 1
```

`moto`'s `@mock_aws` decorator intercepts boto3 SQS calls; tests run
without network.

## Step 4 - LocalStack integration test

```yaml
# docker-compose.yml
services:
  localstack:
    image: localstack/localstack:latest
    ports: [4566:4566]
    environment:
      SERVICES: sqs
```

```python
sqs = boto3.client(
    'sqs',
    endpoint_url='http://localhost:4566',
    region_name='us-east-1',
    aws_access_key_id='test', aws_secret_access_key='test',
)
queue_url = sqs.create_queue(QueueName='orders')['QueueUrl']
# ... full SQS API works, including visibility timeouts, DLQ, FIFO
```

## Step 5 - Test visibility-timeout behavior

Visibility timeout keeps an in-flight message invisible to other
receivers for a configurable window, preventing duplicate processing
([SQS developer guide][sqs-dg]).

Test pattern (LocalStack or real SQS, NOT mock):

```python
sqs.send_message(QueueUrl=queue_url, MessageBody='test')
msg1 = sqs.receive_message(QueueUrl=queue_url, VisibilityTimeout=30)['Messages'][0]
# Within 30s, the message should be invisible to other receivers:
msg2 = sqs.receive_message(QueueUrl=queue_url)
assert msg2.get('Messages') is None
# After visibility timeout (or explicit ChangeMessageVisibility), it returns:
sqs.change_message_visibility(
    QueueUrl=queue_url,
    ReceiptHandle=msg1['ReceiptHandle'],
    VisibilityTimeout=0,
)
msg3 = sqs.receive_message(QueueUrl=queue_url)
assert msg3['Messages'][0]['MessageId'] == msg1['MessageId']
```

## Step 6 - Test DLQ routing

SQS routes a message to the dead-letter queue after `maxReceiveCount`
failed deliveries (poison-message isolation, per the SQS developer
guide). Full LocalStack recipe:
[references/localstack-recipes.md](references/localstack-recipes.md).

## Step 7 - Test FIFO ordering + dedup

FIFO queues (`FifoQueue: 'true'`) preserve per-`MessageGroupId` order
and drop identical bodies within a 5-minute dedup window
(`ContentBasedDeduplication`). Full LocalStack recipe:
[references/localstack-recipes.md](references/localstack-recipes.md).

## Step 8 - Message retention

SQS auto-deletes messages older than the retention period: default 4
days, configurable from 60 seconds to 1,209,600 seconds (14 days)
([SQS developer guide][sqs-dg]). Tests rarely verify retention
directly; document the expected retention in queue setup (Terraform /
CloudFormation) and review per-team.

## Step 9 - CI integration

```yaml
services:
  localstack:
    image: localstack/localstack:latest
    ports: [4566:4566]
    env: { SERVICES: sqs }

steps:
  - run: pytest tests/integration/sqs/ -v
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test visibility-timeout via mock | Mock doesn't track invisibility window; tests pass-by-accident | Use LocalStack (Step 4 - 5) |
| Skip DLQ-routing test | Poison-message handling unverified; production incidents | Always cover DLQ for production queues (Step 6) |
| Use Standard-queue body assertions sensitive to delivery order | At-least-once = duplicates + reordering | Assert per-message processing idempotency, not order |
| Hard-code queue URLs in tests | Tests break when account / region changes | Pull from env vars / fixtures |

## Limitations

- LocalStack ≠ real SQS - some behaviors (extreme latency, AWS
  throttling) are not emulated.
- FIFO throughput limits (300 messages/sec without
  high-throughput mode) need real SQS to verify.
- Cost-effective sandbox testing requires per-PR queue cleanup; use
  random queue-name suffixes + cleanup hooks.

## References

- [sqs-dg][sqs-dg] - official SQS developer guide; standard vs FIFO,
  visibility timeout, DLQ, retention
- docs.aws.amazon.com/AWSSimpleQueueService - full SQS docs
- localstack.cloud - LocalStack SQS emulator
- pypi.org/project/moto - Python AWS mock
- npmjs.com/package/aws-sdk-client-mock - TypeScript AWS mock
- `sidekiq-tests`,
  `celery-tests`,
  `bullmq-tests`,
  `rabbitmq-tests` - sister tools
- `idempotency-test-author` - 
  critical companion for at-least-once SQS Standard queues
