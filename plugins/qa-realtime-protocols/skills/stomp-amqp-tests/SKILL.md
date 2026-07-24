---
name: stomp-amqp-tests
description: "Tests STOMP over WebSocket (Spring, ActiveMQ, RabbitMQ Web STOMP) and AMQP 0-9-1 (RabbitMQ Java client) - frame connect/subscribe/send/ack sequences, ack modes (auto/client/client-individual), exchange and queue declarations, binding routing, Testcontainers RabbitMQ broker, and delivery assertion. Use when validating enterprise Spring or RabbitMQ messaging stacks before deploy."
metadata:
  keywords: "stomp, amqp, rabbitmq, spring-messaging, activemq, testcontainers, realtime-protocols"
---

# stomp-amqp-tests

This skill covers two complementary enterprise messaging protocols that
travel together on Spring and RabbitMQ stacks: STOMP over WebSocket
(used by Spring `@MessageMapping` endpoints and browser clients) and
AMQP 0-9-1 (used by RabbitMQ producer/consumer code). Both require
protocol-level test coverage that HTTP and WebSocket-only tools miss.

STOMP frame semantics are defined in the
[STOMP 1.2 specification](https://stomp.github.io/stomp-specification-1.2.html).
AMQP 0-9-1 exchange/queue/binding and acknowledgement behaviour is documented
in [RabbitMQ's AMQP concepts guide](https://www.rabbitmq.com/tutorials/amqp-concepts).

Nearest neighbors and differentiation:
- `mqtt-tests` - covers QoS 0/1/2 for IoT/M2M; does not cover STOMP frames,
  exchange routing, or Java AMQP client patterns.
- `websocket-tests` - covers raw WebSocket frames; does not know STOMP frame
  types, ack modes, or AMQP broker topology.
- `webhook-replay-tests` - covers HTTP at-least-once delivery; different
  transport and no broker involved.

## When to use

- Spring `@MessageMapping` / `@SubscribeMapping` endpoints need pre-deploy
  frame-level validation.
- RabbitMQ exchange/queue/binding topology must be verified before release.
- Consumer ack modes (`auto`, `client`, `client-individual`) or prefetch
  limits need explicit test coverage.
- A Testcontainers RabbitMQ fixture is needed in Java test suites to avoid
  a shared broker dependency.

## Step 1 - Start RabbitMQ with Testcontainers (Java)

The Testcontainers RabbitMQ module spins up an isolated broker per test
class. Per
[java.testcontainers.org/modules/rabbitmq/](https://java.testcontainers.org/modules/rabbitmq/),
add the dependency:

```xml
<!-- Maven -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-rabbitmq</artifactId>
    <version>2.0.5</version>
    <scope>test</scope>
</dependency>
```

```java
@Testcontainers
class BrokerTest {

    @Container
    static RabbitMQContainer rabbit =
        new RabbitMQContainer("rabbitmq:3.13-management");

    @BeforeAll
    static void enablePlugins() {
        // Web STOMP is not enabled by default in the base image;
        // enable for STOMP-over-WebSocket tests
        rabbit.execInContainer("rabbitmq-plugins", "enable",
            "rabbitmq_stomp", "rabbitmq_web_stomp");
    }
}
```

The management image exposes: AMQP on 5672, management UI on 15672,
and STOMP on 61613 (after plugin is enabled). The container maps these
to random host ports retrieved via `rabbit.getMappedPort(5672)` etc.

## Step 2 - STOMP frame handshake test

Per the [STOMP 1.2 spec](https://stomp.github.io/stomp-specification-1.2.html),
a session opens with a `CONNECT` frame (or `STOMP` frame; both are valid
in 1.2) that MUST carry `accept-version` and `host` headers. The server
replies with a `CONNECTED` frame carrying `version`.

```java
// Uses the stompclient Java library or Spring's StompSession
StompSession session = stompClient
    .connectAsync("ws://localhost:" + rabbit.getMappedPort(15674) + "/ws",
        new StompSessionHandlerAdapter() {})
    .get(5, TimeUnit.SECONDS);

assertThat(session.isConnected()).isTrue();
session.disconnect();
```

For raw frame assertions use a TCP/WebSocket client and read the
`CONNECTED` frame: a missing `version` header means the broker rejected
the `accept-version` negotiation.

Heart-beat is negotiated via `heart-beat:<outgoing-ms>,<incoming-ms>` in
the `CONNECT` frame. Per the spec: "if `<cx>` is 0 (the client cannot
send heart-beats) or `<sy>` is 0 (the server does not want to receive
heart-beats) then there will be none; otherwise, there will be heart-beats
every MAX(`<cx>`,`<sy>`) milliseconds."

## Step 3 - STOMP SUBSCRIBE / SEND / ACK frame tests

Per the [STOMP 1.2 spec](https://stomp.github.io/stomp-specification-1.2.html),
the `SUBSCRIBE` frame requires `id` (unique subscription identifier) and
`destination`, with an optional `ack` header.

### Ack mode table

| Ack mode | Spec guarantee | When to use |
|---|---|---|
| `auto` (default) | Broker treats each delivered frame as acknowledged; no client ACK needed | Fire-and-forget; high-throughput sensors |
| `client` | Client sends `ACK`; each ACK is cumulative - acknowledges all prior messages on the subscription | Batch processing where ordering matters |
| `client-individual` | Each `ACK` or `NACK` applies only to the single message identified by the frame's `id` header - no cumulative effect | Independent per-message processing; DLQ workflows |

```java
BlockingQueue<String> received = new LinkedBlockingQueue<>();

session.subscribe("/queue/orders", new StompFrameHandler() {
    @Override
    public Type getPayloadType(StompHeaders headers) { return String.class; }

    @Override
    public void handleFrame(StompHeaders headers, Object payload) {
        received.add((String) payload);
        // ACK required when ack=client or ack=client-individual
        session.acknowledge(headers.getMessageId(), true);
    }
});

session.send("/queue/orders", "order-42");

String msg = received.poll(3, TimeUnit.SECONDS);
assertThat(msg).isEqualTo("order-42");
```

To assert `client-individual` behavior, subscribe with
`ack: client-individual`, send two messages, ACK the second before the
first, and assert the first is redelivered - confirming non-cumulative
semantics per the spec.

## Step 4 - RabbitMQ Web STOMP (WebSocket port 15674)

Per
[rabbitmq.com/docs/web-stomp](https://www.rabbitmq.com/docs/web-stomp),
enabling the plugin: `rabbitmq-plugins enable rabbitmq_web_stomp`. The
plugin "listens on all interfaces on port 15674" at path `/ws`. Browser
clients connect as:

```javascript
const ws = new WebSocket('ws://127.0.0.1:15674/ws');
const client = Stomp.over(ws);
client.connect('guest', 'guest', onConnect, onError, '/');
```

For server-side integration tests use the same STOMP TCP port (61613)
via the `rabbitmq_stomp` plugin, which per
[rabbitmq.com/docs/stomp](https://www.rabbitmq.com/docs/stomp) "ships
in the core distribution and handles STOMP 1.0 through 1.2." RabbitMQ
STOMP destination prefixes:

| Prefix | Meaning |
|---|---|
| `/queue/<name>` | STOMP-managed durable queue |
| `/topic/<routing-key>` | Topic exchange pub/sub |
| `/exchange/<name>/<routing-key>` | Named exchange with routing key |
| `/amq/queue/<name>` | Queue created outside the STOMP adapter |
| `/temp-queue/<name>` | Auto-delete reply queue |

## Step 5 - AMQP 0-9-1 exchange, queue, and binding tests

Per the
[RabbitMQ AMQP concepts guide](https://www.rabbitmq.com/tutorials/amqp-concepts),
"messages are published to exchanges, which distribute message copies to
queues using rules called bindings." The four exchange types:

| Type | Routing rule |
|---|---|
| `direct` | Exact match on routing key per [rabbitmq.com/docs/exchanges](https://www.rabbitmq.com/docs/exchanges) |
| `fanout` | Copies to all bound queues; routing key ignored |
| `topic` | `*` matches one dot-segment; `#` matches zero or more |
| `headers` | Routes on message attribute map instead of routing key |

```java
ConnectionFactory factory = new ConnectionFactory();
factory.setHost("localhost");
factory.setPort(rabbit.getMappedPort(5672));
factory.setUsername("guest");
factory.setPassword("guest");

try (Connection conn = factory.newConnection();
     Channel ch = conn.createChannel()) {

    // Declare a durable direct exchange and a durable queue
    ch.exchangeDeclare("orders.direct", "direct", /*durable=*/true);
    ch.queueDeclare("orders.eu", /*durable=*/true,
        /*exclusive=*/false, /*autoDelete=*/false, null);
    ch.queueBind("orders.eu", "orders.direct", "eu");

    // Publish with delivery-mode=2 (persistent)
    AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
        .deliveryMode(2)
        .contentType("application/json")
        .build();
    ch.basicPublish("orders.direct", "eu", props,
        "{\"id\":1}".getBytes(StandardCharsets.UTF_8));

    // Consume and assert
    GetResponse resp = ch.basicGet("orders.eu", /*autoAck=*/false);
    assertThat(resp).isNotNull();
    assertThat(new String(resp.getBody())).contains("\"id\":1");
    ch.basicAck(resp.getEnvelope().getDeliveryTag(), /*multiple=*/false);
}
```

The Java client API is documented at
[rabbitmq.com/client-libraries/java-api-guide](https://www.rabbitmq.com/client-libraries/java-api-guide).

## Step 6 - Consumer ack mode and prefetch tests

Per [rabbitmq.com/docs/confirms](https://www.rabbitmq.com/docs/confirms):

- `basic.ack` is used for positive acknowledgements.
- `basic.nack` is the RabbitMQ extension for negative acknowledgements
  (supports `multiple` flag; `basic.reject` does not).
- `basic.reject` rejects a single message; set `requeue=false` to send
  the message to a Dead Letter Exchange instead of back to the queue.
- Delivery tags are "monotonically growing positive integers scoped per
  channel" and "deliveries must be acknowledged on the same channel they
  were received on."

```java
// Prefetch = 1: broker sends at most 1 unacked message at a time
ch.basicQos(1);

boolean autoAck = false;
ch.basicConsume("orders.eu", autoAck, "consumer-tag",
    new DefaultConsumer(ch) {
        @Override
        public void handleDelivery(String tag, Envelope env,
                                   AMQP.BasicProperties props,
                                   byte[] body) throws IOException {
            try {
                process(body);
                ch.basicAck(env.getDeliveryTag(), /*multiple=*/false);
            } catch (Exception e) {
                // requeue=false routes to DLX
                ch.basicNack(env.getDeliveryTag(),
                    /*multiple=*/false, /*requeue=*/false);
            }
        }
    });
```

Per the confirms doc, "`basic.qos` sets the max number of unacknowledged
deliveries permitted on a channel; a value of zero means no limit."
Setting `basicQos(1)` is the recommended pattern for fair dispatch in
round-robin consumer pools.

## Step 7 - Publisher confirms test

Per [rabbitmq.com/docs/publishers](https://www.rabbitmq.com/docs/publishers),
publisher confirms "provide a mechanism for application developers to keep
track of what messages have been successfully accepted by RabbitMQ." Enable
on the channel then await confirmation:

```java
ch.confirmSelect();

ch.basicPublish("orders.direct", "eu", null,
    "ping".getBytes(StandardCharsets.UTF_8));

boolean acked = ch.waitForConfirms(5000 /*ms*/);
assertThat(acked).isTrue();
```

For throughput tests, use streaming confirms (asynchronous) rather than
`waitForConfirms` per message; the publishers doc warns that "waiting for
confirmation after each message causes a very significant negative effect
on throughput."

## Example: end-to-end STOMP publish / AMQP consume

Send a message via STOMP (as a browser or Spring client would) and
receive it via AMQP (as a backend service would), asserting the message
survives the bridge:

```java
// STOMP sender (port 61613 TCP or 15674 WS)
session.send("/exchange/orders.direct/eu",
    new StompHeaders(), "order-99".getBytes());

// AMQP receiver - same queue that exchange routes to
Thread.sleep(200); // allow broker routing
GetResponse r = ch.basicGet("orders.eu", true /*autoAck*/);
assertThat(r).isNotNull();
assertThat(new String(r.getBody())).isEqualTo("order-99");
```

This test catches misconfigured exchange-queue bindings that unit tests
on the STOMP layer alone would not reveal.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test with `ack=auto` only | `client` / `client-individual` redelivery bugs ship silently | Step 3 covers ack mode matrix |
| Declare non-durable queues in integration tests | Broker restart drops queue; CI becomes flaky | Use `durable=true` in `queueDeclare` |
| Use bare `waitForConfirms()` with no timeout | Hangs CI on unroutable messages | Pass a timeout ms value |
| Share one channel across threads | Per the Java API guide, channels are not thread-safe | One channel per thread |
| Forget `ch.basicQos` in round-robin consumer | One slow consumer starves; others idle | Set `basicQos(1)` before `basicConsume` |
| Assert only STOMP without checking AMQP binding | Binding misconfiguration is invisible to STOMP layer | Use the bridge test in Step 7 |

## Limitations

- AMQP 1.0 (a separate protocol) is out of scope; RabbitMQ 4.3+ supports
  it but under a different plugin. The skill covers AMQP 0-9-1 only.
- Spring's `@MessageMapping` layer (SockJS + STOMP) adds session management
  on top of raw STOMP; test it via `StompClient` in Spring's
  `spring-messaging` test support, not raw TCP frames.
- Testcontainers `RabbitMQContainer` uses the official `rabbitmq` Docker
  image; CI must have Docker available. Use `@Container` (static) for
  test-class scope rather than per-test to keep suite time reasonable.
- TLS/mTLS and vhost access control are not tested here; add a separate
  security suite if your deployment uses them.

## References

- [STOMP 1.2 specification](https://stomp.github.io/stomp-specification-1.2.html) - frame types, ack modes, heart-beat
- [RabbitMQ AMQP concepts](https://www.rabbitmq.com/tutorials/amqp-concepts) - exchanges, queues, bindings, channel model
- [RabbitMQ exchanges](https://www.rabbitmq.com/docs/exchanges) - direct/fanout/topic/headers routing rules
- [RabbitMQ consumer confirms](https://www.rabbitmq.com/docs/confirms) - ack/nack/reject, delivery tags, prefetch
- [RabbitMQ publishers](https://www.rabbitmq.com/docs/publishers) - publisher confirms, mandatory flag
- [RabbitMQ Web STOMP plugin](https://www.rabbitmq.com/docs/web-stomp) - WebSocket port 15674, browser client
- [RabbitMQ STOMP plugin](https://www.rabbitmq.com/docs/stomp) - destination prefixes, TCP port 61613
- [RabbitMQ Java client API guide](https://www.rabbitmq.com/client-libraries/java-api-guide) - ConnectionFactory, Channel, basicPublish, basicConsume
- [Testcontainers RabbitMQ module](https://java.testcontainers.org/modules/rabbitmq/) - RabbitMQContainer, dependency coordinates
- `mqtt-tests` - QoS 0/1/2 for IoT/M2M MQTT stacks
- `websocket-tests` - raw WebSocket frame testing
