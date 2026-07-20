---
name: load-testing-overview
description: "Teaches load and performance testing from zero: how to choose between k6, JMeter, Gatling, Locust, and Artillery based on observable project facts (team language, tests-as-code vs GUI authoring, protocols beyond HTTP, CI gating needs); the six load profiles (smoke, average-load, stress, spike, soak, breakpoint) and the question each one answers; the difference between open workload models that hold arrival rate constant and closed models that hold concurrent users constant; why percentiles rather than averages are the unit of measurement; and how to turn a run into a pass/fail CI gate, with a first runnable k6 script. Use when a service needs performance coverage and the tool, the load profile, or the pass/fail threshold has not been decided yet."
---

# load-testing-overview

Load testing drives concurrent, sustained traffic at a deployed system and
measures what happens to response time, throughput, and errors while that
traffic runs.

It is not a layer of the test pyramid, it is a different axis. Unit,
integration, and end-to-end tests ask "is the answer correct?" one user at a
time. A load test assumes correctness and asks "is it still fast and still
correct at 200 concurrent users, and where does it stop being either?" The
practical consequence: it needs a deployed environment, realistic data volumes,
and a real network path. Run one against a laptop dev server and you measured
the laptop.

## Pick a tool from what is already in the repo

Five tools cover almost every case. Read the table top to bottom and stop at the
first row that is true of your project. The rows are ordered so that hard
constraints (protocol, who authors the tests) beat preferences (language).

| Observable fact about your project | Pick | Why |
|---|---|---|
| You must generate load over JDBC, JMS, LDAP, FTP, SMTP/POP3/IMAP, TCP, or raw shell commands, not only HTTP | **JMeter** | It is the only one of the five with those built in: JMeter lists Web HTTP/HTTPS, "SOAP / REST Webservices", FTP, "Database via JDBC", LDAP, "Message-oriented middleware (MOM) via JMS", "Mail - SMTP(S), POP3(S) and IMAP(S)", "Native commands or shell scripts", and TCP ([JMeter home](https://jmeter.apache.org/)) |
| Non-programmers (manual QA, ops) must build and maintain the tests themselves | **JMeter** | It is "a 100% pure Java application" with a "Full featured Test IDE" GUI for recording and building plans ([JMeter home](https://jmeter.apache.org/)) |
| The team's build is Maven, Gradle, or sbt and the testers are JVM developers | **Gatling** | "Since 3.7, Gatling supports writing tests in Java, Scala, and Kotlin" and installs through those build tools ([Gatling install](https://docs.gatling.io/reference/deploy/install-local/)) |
| The test logic needs arbitrary Python (an internal SDK, pandas, a crypto lib) | **Locust** | Tests are plain Python: `from locust import HttpUser, task` in a `locustfile.py` ([Locust quickstart](https://docs.locust.io/en/stable/quickstart.html)) |
| You want the load profile declared as data, not code, and Node is already installed | **Artillery** | The test script is YAML: `config.phases` "defines how Artillery generates new virtual users (VUs) in a specified time period" ([Artillery test script](https://www.artillery.io/docs/reference/test-script)) |
| Anything else: HTTP/gRPC/WebSocket service, JS or TS team, tests must live in git | **k6** | Scripts are JavaScript, the runner is a single binary, and it natively supports HTTP/1.1, HTTP/2, WebSockets, and gRPC ([k6 protocols](https://grafana.com/docs/k6/latest/using-k6/protocols/)) |

Two follow-on constraints that change the answer:

- **Tests must be reviewable in a pull request.** k6, Gatling, Locust, and
  Artillery all store tests as ordinary source files. JMeter plans are `.jmx`
  files produced by the GUI and passed to the runner with
  `jmeter -n -t my_test.jmx -l log.jtl` ([JMeter get started](https://jmeter.apache.org/usermanual/get-started.html)).
  Teams commonly find those generated plan files hard to diff in review; that is
  a practitioner observation, not a documented limitation. If code review of the
  test itself matters to you, that alone rules JMeter out.
- **CI must fail the build with no extra plumbing.** k6 and Artillery both exit
  non-zero on a failed budget out of the box (see the threshold section below).
  With JMeter you get a `.jtl` results file and have to assert on it yourself.

**If you truly have no constraint, choose k6.** It has the shortest path from
zero to a failing build, which is the only path that matters at the start.

## The six load profiles

Newcomers say "load test" for all six of these and then argue past each other.
Each name answers a different question, and the profiles are defined by k6 as
follows ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)):

| Profile | Question it answers | Shape |
|---|---|---|
| **Smoke** | Does the script itself work, and is the system sane at trivial load? | Low VUs, seconds to a couple of minutes |
| **Average-load** | How does the system behave under expected normal conditions? | Average production VUs, 5 to 60 minutes |
| **Stress** | What happens when demand exceeds the expected average? | VUs above average, 5 to 60 minutes |
| **Spike** | Does the system survive a sudden, short, massive surge? | Very high VUs, a few minutes |
| **Soak (endurance)** | Is it still reliable after hours of continuous operation? | Average VUs, hours |
| **Breakpoint** | Where is the capacity ceiling? | Ramp up incrementally until it breaks |

Two of these are routinely confused. **Stress** holds an above-average load
steady and watches how the system copes; **breakpoint** keeps increasing load
until the system fails, so its output is a number (the ceiling), not a verdict.
**Soak** uses ordinary load and long duration on purpose: it exists to catch
memory leaks, connection-pool exhaustion, and log-disk growth, which a 10-minute
run cannot see.

Run smoke first, always. A broken script under 300 VUs produces a very
convincing graph of nothing.

## Open vs closed workload models

This is the single most misunderstood idea in the field, and it decides whether
your numbers mean anything.

- **Closed model:** you hold the number of concurrent users constant. New work
  starts only when old work finishes. In k6's words, "In the closed model, VU
  iterations start only when the last iteration finishes," so "the target
  system's response time can influence the throughput of the test"
  ([k6 open vs closed](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)).
- **Open model:** you hold the arrival rate constant. "In the open model, on the
  other hand, VUs arrive independently of iteration completion," so "the response
  times of the target system no longer influence the load on the target system"
  ([k6 open vs closed](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)).

Why it matters: under a closed model, when the system slows down, your test
automatically applies *less* load, which hides the problem exactly when it
starts. k6 names this: "In some testing literature, this problem is known as
coordinated omission"
([k6 open vs closed](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)).

Real user traffic on a public web service is open (people keep arriving whether
or not you are coping). Gatling puts it the same way: "Open systems have no
control over the number of concurrent users: users keep on arriving even though
applications have trouble serving them," while "Closed systems are systems where
the number of concurrent users is capped"
([Gatling workload models](https://docs.gatling.io/testing-concepts/workload-models/)).
Closed is the right model for a fixed-size worker pool, a call-centre queue, or a
system behind a hard concurrency limit.

How each tool expresses the two models:

| Tool | Open (arrival rate held constant) | Closed (concurrency held constant) |
|---|---|---|
| k6 | `constant-arrival-rate`, `ramping-arrival-rate` | `constant-vus`, `ramping-vus`, `shared-iterations`, `per-vu-iterations` ([k6 executors](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/)) |
| Gatling | `injectOpen(...)` with `atOnceUsers(nbUsers)`, `rampUsers(nbUsers).during(duration)`, `constantUsersPerSec(rate).during(duration)`, `rampUsersPerSec(rate1).to(rate2).during(duration)`, `stressPeakUsers(nbUsers).during(duration)` | `injectClosed(...)` with `constantConcurrentUsers(nbUsers).during(duration)`, `rampConcurrentUsers(fromNbUsers).to(toNbUsers).during(duration)` ([Gatling injection](https://docs.gatling.io/concepts/injection/)) |
| Artillery | `arrivalRate` (new VUs per second), `rampTo`, `arrivalCount` ([Artillery test script](https://www.artillery.io/docs/reference/test-script)) | not the native model |
| JMeter | not the native model | Thread Group: a thread count, a ramp-up period, and a loop count, where "Each thread will execute the test plan in its entirety and completely independently of other test threads" ([JMeter test plan](https://jmeter.apache.org/usermanual/test_plan.html)) |
| Locust | approximated with `constant_throughput` wait time, "an adaptive time that ensures the task runs (at most) X times per second" ([Locust locustfile](https://docs.locust.io/en/stable/writing-a-locustfile.html)) | the default: a fixed user count plus `wait_time` |

**The Gatling trap, spelled out.** `rampUsers(n).during(d)` and
`atOnceUsers(n)` are **open** model profiles despite the word "users": they
inject `n` users *into* the system over the window and never cap how many are
inside at once. The closed equivalents are the ones with "Concurrent" in the
name, `constantConcurrentUsers` and `rampConcurrentUsers`, and they live under
`injectClosed` ([Gatling injection](https://docs.gatling.io/concepts/injection/)).
The two families cannot be mixed in one injection profile.

## Run your first test with k6

Install ([k6 install](https://grafana.com/docs/k6/latest/set-up/install-k6/)):

```bash
brew install k6                     # macOS
choco install k6                    # Windows, Chocolatey
winget install k6 --source winget   # Windows, winget
docker pull grafana/k6              # any platform
```

Write `script.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th percentile under 500ms
    http_req_failed:   ['rate<0.01'],  // under 1% failed requests
  },
};

export default function () {
  const res = http.get('https://your-service.example.com/health');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

Run it ([k6 running](https://grafana.com/docs/k6/latest/get-started/running-k6/)):

```bash
k6 run script.js
k6 run --vus 10 --duration 30s script.js   # same shape, set from the CLI
```

**What success looks like:** a live progress table during the run, then an
end-of-run summary in which every threshold line is marked with a green check.
`http_req_duration` reports `avg`, `min`, `med`, `max`, `p(90)`, and `p(95)`
([k6 metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/)). If any
threshold fails, "the little green checkmark next to the threshold name would be
a red cross and k6 would exit with a non-zero exit code"
([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)). That
non-zero exit is your entire CI gate: no plugin, no parser, no dashboard.

That first run is a smoke test. Only after it is green should you raise VUs or
switch to an arrival-rate executor.

## Percentiles, not averages

Report and gate on percentiles. An average response time is a single number
produced by summing everything and dividing, so a handful of 8-second requests
disappear into thousands of 40ms ones. The p95 and p99 are the response times
that 5% and 1% of requests exceeded, which is the experience of your slowest
users and, on a page that makes 20 backend calls, the experience of most
sessions.

This is why every tool in the list exposes percentiles as first-class threshold
targets: k6 with `http_req_duration: ['p(95)<200']`
([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)) and
Artillery with `p95: 200` in its `ensure` block
([Artillery ensure](https://www.artillery.io/docs/reference/extensions/ensure/)).

Practical rules, which are practitioner convention rather than a documented
standard:

- Quote p50, p95, and p99 together. p50 alone flatters you; p99 alone is noisy
  at low request counts, and a p99 over 200 requests is two data points.
- Never average percentiles across separate runs or separate load generators.
  The result is not a percentile of anything.
- Compare like with like: same profile, same duration, same environment. A p95
  from a 30-second smoke run is not comparable to one from a two-hour soak.

## A test without a threshold is just a graph

If a run cannot fail, nobody will ever act on it. Define the pass/fail budget
before the run, and derive the numbers from your service level objectives, not
from whatever the first run happened to produce.

k6 states this directly: "Thresholds are the pass/fail criteria that you define
for your test metrics. If the performance of the system under test (SUT) does not
meet the conditions of your threshold, the test finishes with a failed status"
([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)). Set
`abortOnFail` on a threshold to stop the run the moment the condition goes false
instead of burning the full duration
([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)).

Artillery's `ensure` extension is the same idea in YAML: "Artillery can validate
if a metric's value meets a predefined threshold. If it doesn't, it will exit
with a non-zero exit code"
([Artillery ensure](https://www.artillery.io/docs/reference/extensions/ensure/)).

The k6 guidance on where to run these is worth taking seriously: "As a general
rule on pre-release environments, we should run our larger tests with quality
gates, Pass/Fail criteria that validate SLOs or reliability goals," but "Unless
your verification process is mature, do not rely entirely on Pass/Fail results to
guarantee the reliability of releases"
([k6 automated performance testing](https://grafana.com/docs/k6/latest/testing-guides/automated-performance-testing/)).
Gate the short smoke and average-load runs in CI; run stress, spike, soak, and
breakpoint on a schedule against a dedicated environment.

## Traps that catch newcomers first

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
  why the first script above sets both `http_req_duration` and
  `http_req_failed`.

## Related skills

Optional deeper dives, if you have them installed:
[`k6-load-testing`](../k6-load-testing/SKILL.md),
[`gatling-load-testing`](../gatling-load-testing/SKILL.md),
[`jmeter-load-testing`](../jmeter-load-testing/SKILL.md),
[`locust-load-testing`](../locust-load-testing/SKILL.md),
[`latency-percentile-analyzer`](../latency-percentile-analyzer/SKILL.md).
