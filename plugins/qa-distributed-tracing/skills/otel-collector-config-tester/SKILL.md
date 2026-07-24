---
name: otel-collector-config-tester
description: "Validates OpenTelemetry Collector pipeline configurations and verifies spans flow end-to-end through the collector: runs `otelcol validate --config`, wires the `debug`/`file` exporter for span-output assertions, and integrates the full cycle into CI. Use when a collector config change (new receiver, processor swap, exporter wiring) needs correctness verification before deployment."
metadata:
  keywords: "opentelemetry, distributed-tracing, collector, pipeline-testing, otelcol-validate, debug-exporter, file-exporter, observability-testing"
---

# otel-collector-config-tester

Per the [OTel Collector overview], the Collector is "a vendor-agnostic way
to receive, process and export telemetry data." It operates as a three-stage
pipeline: receivers accept spans from instrumented services, processors
transform them, and exporters forward them to backends. A misconfigured
pipeline silently drops or misroutes spans - no error at deploy time, only
missing data at query time.

This skill tests two distinct failure modes:

1. **Static config errors** - invalid YAML, undefined component references,
   missing required fields. Caught by `otelcol validate` before the process
   starts.
2. **Dynamic pipeline errors** - a syntactically valid config that doesn't
   actually forward spans (wrong pipeline wiring, processor ordering, filter
   that drops everything). Caught only by sending real spans and asserting
   on the output.

## When to use

- A new receiver, processor, or exporter is added to a Collector config
  and the team needs to confirm the pipeline is wired correctly before
  deploying.
- A processor chain (batch, filter, transform/OTTL) was reordered and
  span loss or attribute mutation must be ruled out.
- CI should gate on "collector config is valid and spans reach the exporter"
  rather than relying on post-deploy observation.

## Step 1 - Validate config syntax with `otelcol validate`

Per the [OTel Collector configuration docs], run:

```shell
otelcol validate --config=collector-config.yaml
```

This checks that all components referenced in `service.pipelines` are
defined in their respective top-level sections, required fields are present,
and the YAML parses cleanly. It does not start the collector process.

The config structure the validator checks:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  batch: {}

exporters:
  otlp/backend:
    endpoint: "https://backend.example.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]
```

Per the [OTel Collector configuration docs], components follow `type[/name]`
naming (`otlp/backend` above), which allows multiple instances of the same
type in one config. Every component referenced in `service.pipelines` must
be declared in its top-level section - `validate` reports undefined
references as errors.

**In CI:**

```yaml
- name: Validate collector config
  run: otelcol validate --config=collector-config.yaml
```

Exit code is non-zero on any validation error, so a failing step blocks
the pipeline.

## Step 2 - Wire the `debug` exporter to observe span flow

Per the [OTel Collector troubleshooting docs], add the `debug` exporter to
a test pipeline alongside (or instead of) the production exporter. This
exporter writes span data to the collector process stdout without requiring
a backend.

Per the [debug exporter README], three verbosity levels are available:

| Level | Output per batch |
|---|---|
| `basic` (default) | Single-line count summary: `"resource spans": 1, "spans": 2` |
| `normal` | One line per span record |
| `detailed` | Full multi-line dump: TraceID, ParentID, timestamps, status, all attributes |

Config to route a test pipeline through the debug exporter:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces/test:
      receivers: [otlp]
      processors: []
      exporters: [debug]
```

Per the [OTel Collector configuration docs], multiple pipelines of the same
signal type use `type/name` syntax (`traces/test` above), so the test
pipeline does not conflict with the production `traces` pipeline in the same
config.

Send a span to the collector and grep stdout for the trace ID or a known
attribute to assert receipt:

```shell
# Send a test span via grpcurl or the OTel SDK
grpcurl -plaintext -d @ localhost:4317 \
  opentelemetry.proto.collector.trace.v1.TraceService/Export \
  < test-span.json

# Assert the debug exporter emitted the span
docker logs <container> 2>&1 | grep "my.attribute"
```

## Step 3 - Wire the `file` exporter for machine-readable assertions

The `debug` exporter writes to stdout, which is inconvenient for assertion
scripts. Per the [file exporter README], the `file` exporter writes each
exported batch as a JSON object per line, making it grep- and jq-parseable:

```yaml
exporters:
  file:
    path: /tmp/collector-spans.jsonl

service:
  pipelines:
    traces/test:
      receivers: [otlp]
      processors: []
      exporters: [file]
```

After sending spans, assert on the output file:

```shell
# Check at least one span was exported
[ $(wc -l < /tmp/collector-spans.jsonl) -gt 0 ] || { echo "No spans exported"; exit 1; }

# Assert a specific attribute value was preserved through processors
jq -e '
  .resourceSpans[].scopeSpans[].spans[]
  | select(.name == "order.create")
  | .attributes[]
  | select(.key == "order.item_count")
  | .value.intValue == 1
' /tmp/collector-spans.jsonl
```

Per the [file exporter README], "each line in the file is a JSON object,"
which matches the OTLP/JSON protobuf encoding. The default `flush_interval`
is 1 second - wait at least 2 seconds after the last span before asserting
on the file in a test script.

## Step 4 - Test processor behavior end-to-end

Processors modify spans in transit. A common failure mode: a filter or
transform processor was added but its OTTL condition is wrong, silently
dropping all spans.

Test pattern using the file exporter as the oracle:

```yaml
processors:
  # Filter keeps only spans with http.response.status_code >= 400
  filter/errors_only:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.response.status_code"] < 400'

service:
  pipelines:
    traces/test:
      receivers: [otlp]
      processors: [filter/errors_only]
      exporters: [file]
```

Send two spans - one with `http.response.status_code = 200`, one with
`http.response.status_code = 500` - then assert the file contains exactly
one span with the 500 status code and zero spans with 200.

Per the [OTel Collector transforming telemetry docs], the Transform processor
uses OTTL (OpenTelemetry Transformation Language) for advanced mutations.
Test attribute mutations the same way: send a known input span, read the
file exporter output, assert the mutated attribute value.

## Step 5 - CI integration

Full pipeline: validate config, start the collector in Docker, send test
spans, assert on the file exporter output, stop the container.

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

Per the [OTel Collector quick-start docs], the Docker image exposes OTLP
over gRPC on port 4317 and OTLP over HTTP on port 4318. Pin the image tag
(`0.153.0` above) - the `latest` tag changes component stability levels
between releases.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Only running `otelcol validate` | Catches syntax errors but not pipeline wiring or processor logic errors | Add a send-and-assert step (Steps 2-4) |
| Using `debug` exporter with `basic` verbosity for assertions | Outputs only count summaries; no attribute values to assert on | Use `verbosity: detailed` or switch to `file` exporter |
| Asserting immediately after sending spans | `file` exporter `flush_interval` defaults to 1s - file may be empty | Wait at least 2s after last span |
| Using `latest` Docker image tag in CI | Component stability levels change between releases; tests break on unrelated collector upgrades | Pin to a specific version tag |
| Reusing production exporter in test pipeline | Sends test spans to the live backend | Use a named test pipeline (`traces/test`) with `file` or `debug` exporter |

## Limitations

- `otelcol validate` does not check network reachability of exporter
  endpoints - a valid config may still fail at runtime if the backend
  is unreachable.
- The `file` exporter is in the contrib distribution
  (`otel/opentelemetry-collector-contrib`), not the core distribution.
  Verify it is present in the collector build used in CI.
- Per the [file exporter README], the default `flush_interval` is 1 second;
  very-high-throughput tests may need `flush_interval: 100ms` to avoid
  waiting on large batches.
- This skill covers pipeline correctness testing. For sampling-ratio
  verification or tail-sampling behavior, pair with
  `opentelemetry-trace-assertions`
  which uses in-process SDK exporters for finer-grained span-count control.

## References

- [OTel Collector overview] - pipeline model, receiver/processor/exporter roles
- [OTel Collector configuration docs] - YAML structure, component naming,
  `service.pipelines`, `otelcol validate` command
- [OTel Collector troubleshooting docs] - debug exporter setup
- [OTel Collector transforming telemetry docs] - OTTL, filter/transform
  processor config
- [OTel Collector quick-start docs] - Docker image, port mapping
- [debug exporter README] - verbosity levels (basic/normal/detailed),
  `sampling_initial`, `sampling_thereafter`
- [file exporter README] - JSON-lines output format, `path`, `flush_interval`
- `opentelemetry-trace-assertions` -
  in-process SDK in-memory exporter for unit-level span assertions

[OTel Collector overview]: https://opentelemetry.io/docs/collector/
[OTel Collector configuration docs]: https://opentelemetry.io/docs/collector/configuration/
[OTel Collector troubleshooting docs]: https://opentelemetry.io/docs/collector/troubleshooting/
[OTel Collector transforming telemetry docs]: https://opentelemetry.io/docs/collector/transforming-telemetry/
[OTel Collector quick-start docs]: https://opentelemetry.io/docs/collector/quick-start/
[debug exporter README]: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
[file exporter README]: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
