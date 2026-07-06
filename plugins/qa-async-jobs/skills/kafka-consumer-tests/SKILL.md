---
name: kafka-consumer-tests
description: "Tests Apache Kafka consumer and producer logic across KafkaJS (Node.js), kafka-go (Go), and Spring Kafka (Java) - spins up a real broker via the Testcontainers Kafka module, asserts offset management and consumer-group rebalance behavior, distinguishes at-least-once from exactly-once (EOS / transactions), validates idempotent producer configuration, and routes unprocessable messages to a dead-letter topic. Use when the user works with Kafka producers or consumers in any language and needs integration or unit tests that exercise delivery semantics, offset commits, rebalance handling, or dead-letter routing."
---

# kafka-consumer-tests

## Overview

Apache Kafka is a distributed event-streaming platform. Unlike
SQS (visibility-timeout), RabbitMQ (ack/nack), or BullMQ
(job-state machine), Kafka uses consumer-owned committed offsets as
its delivery primitive - every test must control where the read
position is. This skill covers that model: offset management,
consumer-group rebalance, at-least-once vs exactly-once (EOS /
transactions), idempotent producer, and dead-letter routing across
KafkaJS (Node.js), kafka-go (Go), and Spring Kafka (Java).

## Step 1 - Spin up Kafka with Testcontainers

Per [testcontainers.com/modules/kafka][tc-kafka]:

[tc-kafka]: https://testcontainers.com/modules/kafka/

**Node.js / TypeScript**

```bash
npm install @testcontainers/kafka --save-dev
```

```typescript
import { KafkaContainer } from '@testcontainers/kafka';

let container: Awaited<ReturnType<KafkaContainer['start']>>;

beforeAll(async () => {
  container = await new KafkaContainer('confluentinc/cp-kafka:7.2.2').start();
});

afterAll(async () => {
  await container.stop();
});

function brokers(): string[] {
  return [`${container.getHost()}:${container.getMappedPort(9093)}`];
}
```

Per [node.testcontainers.org/modules/kafka][node-tc-kafka], the
mapped port is `9093`; retrieve the host with `container.getHost()`.

[node-tc-kafka]: https://node.testcontainers.org/modules/kafka/

**Java (Maven)**

Per [java.testcontainers.org/modules/kafka][java-tc-kafka]:

[java-tc-kafka]: https://java.testcontainers.org/modules/kafka/

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-kafka</artifactId>
    <version>2.0.5</version>
    <scope>test</scope>
</dependency>
```

```java
KafkaContainer kafka = new KafkaContainer("apache/kafka-native:3.8.0");
kafka.start();
String bootstrapServers = kafka.getBootstrapServers();
```

**Go**

Per [testcontainers.com/modules/kafka][tc-kafka]:

```go
import "github.com/testcontainers/testcontainers-go/modules/kafka"

kafkaContainer, err := kafka.Run(
    context.Background(),
    "confluentinc/confluent-local:7.5.0",
)
```

**Python**

```python
from testcontainers.kafka import KafkaContainer

with KafkaContainer() as kafka:
    bootstrap_server = kafka.get_bootstrap_server()
```

## Step 2 - Basic producer test (KafkaJS)

Per [kafka.js.org/docs/getting-started][kjs-gs]:

[kjs-gs]: https://kafka.js.org/docs/getting-started

```typescript
import { Kafka } from 'kafkajs';

it('produces a message to the topic', async () => {
  const kafka = new Kafka({ brokers: brokers() });
  const producer = kafka.producer();
  await producer.connect();

  const result = await producer.send({
    topic: 'orders',
    messages: [{ key: 'order-1', value: JSON.stringify({ amount: 42 }) }],
  });

  expect(result[0].errorCode).toBe(0);
  await producer.disconnect();
});
```

`producer.send()` returns partition metadata per
[kjs-gs][kjs-gs]; `errorCode: 0` confirms the broker accepted
the record.

## Step 3 - Basic consumer test: offset management

Per [kafka.js.org/docs/consuming][kjs-consuming]:

[kjs-consuming]: https://kafka.js.org/docs/consuming

Two commit strategies:

| Strategy | KafkaJS config | Risk |
|---|---|---|
| Auto-commit | `autoCommit: true` (default) | offset committed before processing finishes - can skip on crash |
| Manual commit | `autoCommit: false` + `commitOffsetsIfNecessary()` | offset committed only after processing - at-least-once |

```typescript
it('consumes messages and commits offsets manually', async () => {
  const kafka = new Kafka({ brokers: brokers() });
  const received: string[] = [];

  const consumer = kafka.consumer({ groupId: 'test-group-1' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  await consumer.run({
    autoCommit: false,
    eachBatch: async ({ batch, commitOffsetsIfNecessary, resolveOffset }) => {
      for (const msg of batch.messages) {
        received.push(msg.value!.toString());
        resolveOffset(msg.offset);          // mark processed
      }
      await commitOffsetsIfNecessary();     // commit atomically
    },
  });

  // wait for consumption then assert
  await new Promise(r => setTimeout(r, 1000));
  expect(received).toContain(JSON.stringify({ amount: 42 }));
  await consumer.disconnect();
});
```

`fromBeginning: true` sets `auto.offset.reset` to `earliest`
per [kjs-consuming][kjs-consuming]: "starts from earliest [offset]
when no committed offset exists."

## Step 4 - Consumer-group rebalance

Per [kafka.js.org/docs/consuming][kjs-consuming], the three timing
parameters that govern rebalance are:

| Parameter | Default | Purpose |
|---|---|---|
| `sessionTimeout` | 30 000 ms | failure-detection window; broker removes member if no heartbeat within this window |
| `rebalanceTimeout` | 60 000 ms | time allowed for members to rejoin after a rebalance is triggered |
| `heartbeatInterval` | 3 000 ms | frequency of liveness pings to the broker |

A rebalance test starts two consumers in the same group, sends
messages, stops one consumer, then asserts the survivor processes
all remaining messages:

```typescript
it('surviving consumer processes all messages after rebalance', async () => {
  const kafka = new Kafka({ brokers: brokers() });
  const groupId = 'rebalance-test-group';

  const c1 = kafka.consumer({ groupId, sessionTimeout: 6000, heartbeatInterval: 1000 });
  const c2 = kafka.consumer({ groupId, sessionTimeout: 6000, heartbeatInterval: 1000 });
  const received: string[] = [];

  for (const c of [c1, c2]) {
    await c.connect();
    await c.subscribe({ topic: 'events', fromBeginning: true });
  }
  c2.run({ eachMessage: async ({ message }) => { received.push(message.value!.toString()); } });
  c1.run({ eachMessage: async ({ message }) => { received.push(message.value!.toString()); } });

  await c1.disconnect();   // trigger rebalance: c2 inherits all partitions

  // send more messages after rebalance
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic: 'events', messages: [{ value: 'post-rebalance' }] });
  await producer.disconnect();

  await new Promise(r => setTimeout(r, 3000));
  expect(received).toContain('post-rebalance');
  await c2.disconnect();
});
```

Lowering `sessionTimeout` to 6 000 ms speeds up the rebalance in
tests; production values are higher to avoid spurious rebalances.

## Step 5 - At-least-once vs exactly-once (EOS / transactions)

At-least-once delivery is the default when `autoCommit: false`
and the processor retries on failure - a crash before
`commitOffsetsIfNecessary()` causes the broker to re-deliver the
unacknowledged messages.

Exactly-once semantics (EOS) requires the transactional producer.
Per [kafka.js.org/docs/transactions][kjs-tx]:

[kjs-tx]: https://kafka.js.org/docs/transactions

```typescript
const producer = kafka.producer({
  transactionalId: 'my-transactional-producer',
  maxInFlightRequests: 1,       // required for EOS
  idempotent: true,             // required for EOS
});
await producer.connect();

const tx = await producer.transaction();
try {
  await tx.send({ topic: 'output', messages: [{ value: 'result' }] });
  // atomically commit the consumer offset with the produced message
  await tx.sendOffsets({ consumerGroupId: 'test-group', topics: [...] });
  await tx.commit();
} catch (err) {
  await tx.abort();
  throw err;
}
```

Per [kjs-tx][kjs-tx]: "The producer must have a max in flight
requests of 1" and must use `acks: -1` (all replicas). The
`transactionalId` should encode topic and partition (e.g.
`'myapp-producer-topic-0'`) so the broker can fence out duplicate
instances.

A consumer must use `readUncommitted: false` (the default) to
exclude in-flight transactional messages per [kjs-consuming][kjs-consuming]:
"Set `readUncommitted: false` (default) to exclude uncommitted
transactional messages from consumption."

**EOS test pattern:**

```typescript
it('exactly-once: aborted transaction produces no visible messages', async () => {
  const producer = kafka.producer({
    transactionalId: 'eos-test',
    maxInFlightRequests: 1,
    idempotent: true,
  });
  await producer.connect();

  const tx = await producer.transaction();
  await tx.send({ topic: 'eos-topic', messages: [{ value: 'ghost' }] });
  await tx.abort();   // consumer should never see 'ghost'

  const consumer = kafka.consumer({ groupId: 'eos-verify' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'eos-topic', fromBeginning: true });
  const received: string[] = [];
  consumer.run({ eachMessage: async ({ message }) => { received.push(message.value!.toString()); } });

  await new Promise(r => setTimeout(r, 1500));
  expect(received).not.toContain('ghost');

  await consumer.disconnect();
  await producer.disconnect();
});
```

## Step 6 - Idempotent producer (standalone)

Per [kafka.js.org/docs/transactions][kjs-tx], `idempotent: true`
can be set without a `transactionalId`. The broker deduplicates
retried produce requests within the same producer session and
sequence number:

```typescript
const producer = kafka.producer({ idempotent: true });
```

This is sufficient to prevent duplicate records from network-level
retries. It does not deduplicate across producer restarts - use
the transactional API (Step 5) or application-level idempotency
(see [`idempotency-test-author`](../idempotency-test-author/SKILL.md))
for cross-restart deduplication.

## Step 7 - Dead-letter topic (DLT)

KafkaJS provides no built-in DLT routing per the consuming
documentation - the application must catch errors in
`eachMessage` / `eachBatch` and produce to a `<topic>.DLT`
topic manually:

```typescript
const consumer = kafka.consumer({ groupId: 'dlt-group' });
const dlqProducer = kafka.producer();
await consumer.connect();
await dlqProducer.connect();
await consumer.subscribe({ topic: 'orders', fromBeginning: true });

consumer.run({
  eachMessage: async ({ topic, message }) => {
    try {
      await processOrder(JSON.parse(message.value!.toString()));
    } catch (err) {
      // route poison message to dead-letter topic
      await dlqProducer.send({
        topic: `${topic}.DLT`,
        messages: [{
          key: message.key,
          value: message.value,
          headers: { 'x-error': String(err) },
        }],
      });
    }
  },
});
```

**Test the DLT route:**

```typescript
it('routes unprocessable message to DLT', async () => {
  // arrange: produce a poison message
  await producer.send({ topic: 'orders', messages: [{ value: 'NOT-JSON' }] });

  await new Promise(r => setTimeout(r, 1500));

  // assert: DLT received the record
  const dltConsumer = kafka.consumer({ groupId: 'dlt-verifier' });
  await dltConsumer.connect();
  await dltConsumer.subscribe({ topic: 'orders.DLT', fromBeginning: true });
  const dltMessages: string[] = [];
  dltConsumer.run({ eachMessage: async ({ message }) => {
    dltMessages.push(message.value!.toString());
  }});
  await new Promise(r => setTimeout(r, 1500));
  expect(dltMessages).toContain('NOT-JSON');
  await dltConsumer.disconnect();
});
```

Spring Kafka provides `@RetryableTopic` for declarative DLT
routing per [docs.spring.io/spring-kafka/reference/testing.html][sk-test].

[sk-test]: https://docs.spring.io/spring-kafka/reference/testing.html

## Step 8 - Other languages

**Java (Spring Kafka + EmbeddedKafka)**

Per [sk-test][sk-test], since Kafka 4.0 only `EmbeddedKafkaKraftBroker`
is available (KRaft / no ZooKeeper):

```java
@SpringJUnitConfig
@EmbeddedKafka(partitions = 1, topics = {"orders"},
    bootstrapServersProperty = "spring.kafka.bootstrap-servers")
class OrderConsumerTest {
    @Autowired EmbeddedKafkaBroker embeddedKafka;

    @Test
    void testTemplate() throws Exception {
        Map<String, Object> cp = KafkaTestUtils.consumerProps("tg", "false", embeddedKafka);
        cp.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest"); // default earliest since 2.5
        Consumer<Integer, String> consumer =
            new DefaultKafkaConsumerFactory<Integer, String>(cp).createConsumer();
        embeddedKafka.consumeFromAnEmbeddedTopic(consumer, "orders");

        KafkaTemplate<Integer, String> template = new KafkaTemplate<>(
            new DefaultKafkaProducerFactory<>(KafkaTestUtils.producerProps(embeddedKafka)), true);
        template.send("orders", "test-order");

        ConsumerRecord<Integer, String> received =
            KafkaTestUtils.getSingleRecord(consumer, "orders");
        assertThat(received).has(value("test-order"));
    }
}
```

**Go (kafka-go + Testcontainers)**

Per [pkg.go.dev/github.com/segmentio/kafka-go][kgo]:

[kgo]: https://pkg.go.dev/github.com/segmentio/kafka-go

```go
func TestRoundTrip(t *testing.T) {
    ctx := context.Background()
    kc, _ := kafka.Run(ctx, "confluentinc/confluent-local:7.5.0")
    defer kc.Terminate(ctx)
    addr := kc.MustConnectionString(ctx)

    w := &kafkago.Writer{Addr: kafkago.TCP(addr), Topic: "events",
        AllowAutoTopicCreation: true}
    w.WriteMessages(ctx, kafkago.Message{Value: []byte("hello")})
    w.Close()

    r := kafkago.NewReader(kafkago.ReaderConfig{
        Brokers: []string{addr}, GroupID: "tg", Topic: "events"})
    m, _ := r.FetchMessage(ctx)          // FetchMessage = manual commit (at-least-once)
    require.Equal(t, "hello", string(m.Value))
    r.CommitMessages(ctx, m)
    r.Close()
}
```

Per [kgo][kgo]: `FetchMessage` + `CommitMessages` is the explicit
commit path; `ReadMessage` auto-commits and is at-most-once on crash.

## Step 9 - CI integration

Testcontainers pulls the broker image at runtime; no `services:`
block is needed. Example for Node.js (GitHub Actions):

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx jest --testPathPattern=kafka
        env:
          TESTCONTAINERS_RYUK_DISABLED: 'true'
```

For Java, replace the Node steps with `actions/setup-java` and
`mvn test`. For Go, replace with `actions/setup-go` and `go test`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use `ReadMessage` (kafka-go) for at-least-once tests | Commits before caller processes; at-most-once on crash | Use `FetchMessage` + `CommitMessages` |
| Share `groupId` across parallel tests | Rebalance storms; flaky message allocation | Use unique `groupId` per test (e.g. append `uuid`) |
| Skip `await producer.disconnect()` / `r.Close()` | Goroutine / connection leaks; CI hangs | Close in `afterAll` / `defer` |
| Assert message count with `autoCommit: true` | Offset committed before processing; race on crash path | Use `autoCommit: false` + manual commit for assertion tests |
| Test EOS with `readUncommitted: true` | Consumer sees aborted messages; false-passing test | Keep `readUncommitted: false` (default) |
| Use `sessionTimeout` > `rebalanceTimeout` | Rebalance never completes | Ensure `sessionTimeout` < `rebalanceTimeout` |

## Limitations

- Testcontainers Kafka image pull adds 30-60 s on a cold CI
  runner; cache the Docker layer to mitigate.
- `kafka-go` does not expose a transactional producer API per
  [kgo][kgo]; EOS tests in Go require the `confluent-kafka-go`
  library or a higher-level framework.
- Spring Kafka's `EmbeddedKafkaKraftBroker` (Kafka 4.0+) does
  not support the old ZooKeeper-based configuration; update
  `spring-kafka-test` to 4.x if migrating from older Spring Boot.
- Consumer-group rebalance test timing is environment-dependent;
  lower `sessionTimeout` in tests (e.g. 6 000 ms) rather than
  relying on wall-clock `sleep` durations.

## References

- [testcontainers.com/modules/kafka][tc-kafka] - module coordinates
  for Java, Node.js, Go, Python, .NET; container lifecycle
- [node.testcontainers.org/modules/kafka][node-tc-kafka] - Node.js
  `KafkaContainer` API, mapped port, SSL/SASL options
- [java.testcontainers.org/modules/kafka][java-tc-kafka] - Java
  `KafkaContainer` / `ConfluentKafkaContainer`, `getBootstrapServers()`
- [kafka.js.org/docs/getting-started][kjs-gs] - KafkaJS install,
  producer `send()` API
- [kafka.js.org/docs/consuming][kjs-consuming] - `eachMessage` /
  `eachBatch`, `fromBeginning`, auto-commit vs manual commit,
  `sessionTimeout`, `rebalanceTimeout`, `readUncommitted`
- [kafka.js.org/docs/transactions][kjs-tx] - transactional producer,
  `idempotent: true`, `maxInFlightRequests: 1`, `sendOffsets()`,
  `commit()` / `abort()`
- [pkg.go.dev/github.com/segmentio/kafka-go][kgo] - `Reader`,
  `Writer`, `FetchMessage`, `CommitMessages`, `GroupID`, `CommitInterval`
- [docs.spring.io/spring-kafka/reference/testing.html][sk-test] -
  `@EmbeddedKafka`, `KafkaTestUtils`, `MockConsumer`, `MockProducer`,
  Spring Kafka 4.x / KRaft broker
- [`sqs-patterns`](../sqs-patterns/SKILL.md),
  [`rabbitmq-patterns`](../rabbitmq-patterns/SKILL.md),
  [`bullmq-tests`](../bullmq-tests/SKILL.md) - sibling broker skills
- [`idempotency-test-author`](../idempotency-test-author/SKILL.md) -
  application-level idempotency patterns (complements Step 6)
