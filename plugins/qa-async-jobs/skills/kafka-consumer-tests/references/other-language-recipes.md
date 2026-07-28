# Kafka consumer tests: other-language recipes

Java (Spring Kafka) and Go (kafka-go) recipes referenced from
`kafka-consumer-tests`'s SKILL.md (Step 8). The KafkaJS recipes remain
in the main skill file.

## Java (Spring Kafka + EmbeddedKafka)

Per the Spring Kafka testing docs
(https://docs.spring.io/spring-kafka/reference/testing.html), since
Kafka 4.0 only `EmbeddedKafkaKraftBroker` is available (KRaft / no
ZooKeeper):

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

## Go (kafka-go + Testcontainers)

Per pkg.go.dev/github.com/segmentio/kafka-go:

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

`FetchMessage` + `CommitMessages` is the explicit commit path;
`ReadMessage` auto-commits and is at-most-once on crash. kafka-go does
not expose a transactional producer API; EOS tests in Go require the
`confluent-kafka-go` library or a higher-level framework.
