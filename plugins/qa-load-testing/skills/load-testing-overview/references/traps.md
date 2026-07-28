# Traps that catch newcomers first

The mistakes that most often invalidate a first load-testing effort. Each one
produces numbers that look real but measure the wrong thing.

- **Load testing the load generator.** If CPU on the machine running the test is
  pinned, your latency numbers are measuring your own laptop. Locust is explicit
  about the cause: "Because Python cannot fully utilize more than one core per
  process (see GIL), you need to run one worker instance per processor core in
  order to have access to all your computing power," which is why it ships
  `locust --processes 4` and a `--master` / `--worker` split
  ([Locust distributed](https://docs.locust.io/en/stable/running-distributed.html)).
  Always watch generator CPU alongside the results.
- **Running JMeter's GUI as the load generator.** The manual is blunt: "GUI mode
  should only be used for creating the test script, CLI mode (NON GUI) must be
  used for load testing"
  ([JMeter get started](https://jmeter.apache.org/usermanual/get-started.html)).
- **Every virtual user hitting one URL with one account.** You will measure a
  cache and a single database row. Parameterise the data, or the result is a
  cache-hit benchmark.
- **A closed-model test presented as a capacity number.** "We handled 500 VUs"
  says nothing about requests per second unless you also state the think time and
  the response time. Arrival rate is the number stakeholders actually want, and
  with `sleep()` removed entirely, 10 VUs can out-request 10,000 real users.
- **Skipping the warm-up.** JIT compilation, connection pools, and cold caches
  make the first 30 to 60 seconds unrepresentative. Discard or ramp through it.
- **Testing a scaled-down environment and extrapolating.** Nothing about
  capacity scales linearly across a connection pool limit or a single-writer
  database.
- **Only recording latency.** A p95 of 120ms while 30% of requests return HTTP
  500 is a fast failure, not a pass. Always gate on error rate too, which is
  why the first script sets both `http_req_duration` and `http_req_failed`.
