# CI integration - full collector config test workflow

Full GitHub Actions workflow: validate the config, start the collector in
Docker, send test spans, assert on the file exporter output, then tear down
the container.

```yaml
jobs:
  collector-config-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate config
        run: |
          docker run --rm \
            -v $PWD/collector-config.yaml:/etc/otel/config.yaml \
            otel/opentelemetry-collector:0.153.0 \
            validate --config=/etc/otel/config.yaml

      - name: Start collector
        run: |
          docker run -d --name otel-test \
            -p 4317:4317 \
            -v $PWD/collector-config-test.yaml:/etc/otel/config.yaml \
            -v /tmp/spans:/tmp/spans \
            otel/opentelemetry-collector-contrib:0.153.0 \
            --config=/etc/otel/config.yaml

      - name: Send test spans and assert
        run: |
          sleep 2   # collector startup
          # send spans (via SDK or grpcurl)
          python3 tests/send_test_spans.py
          sleep 2   # file exporter flush
          # assert at least one span in output
          [ $(wc -l < /tmp/spans/output.jsonl) -gt 0 ]

      - name: Stop collector
        if: always()
        run: docker stop otel-test && docker rm otel-test
```

Notes:

- The Docker image exposes OTLP over gRPC on port 4317 and OTLP over HTTP on
  port 4318.
- Pin the image tag (`0.153.0` above) - the `latest` tag changes component
  stability levels between releases.

Source: [OTel Collector quick-start docs](https://opentelemetry.io/docs/collector/quick-start/) - Docker image, port mapping.
