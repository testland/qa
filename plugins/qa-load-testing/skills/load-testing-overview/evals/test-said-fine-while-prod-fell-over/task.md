# PERF-88: make the signup suite catch what it missed on the 29th

## Problem Description

I picked up PERF-88 out of the 29 August retro and it is due at the end of the
week. On the 29th, merchant signup stopped accepting new merchants shortly after
14:00 and stayed down for 51 minutes. What makes it an action item rather than a
bad day is that we have had a nightly performance suite on that exact path since
March, it has never once gone red, and four days before the outage its report was
presented at the quarterly review as evidence that signup was good for 500
concurrent merchants.

So the retro action is worded, unhelpfully, "make the load test catch this". I
need to actually do that, and I need to explain in the ticket why it did not,
because our director asked and "it was configured wrong" is not going to land.

Nathan has put a two-line change in the retro doc and it is not a silly one. He
has read the same material I have about which workload model you are meant to use
for a public endpoint, and his diff switches the simulation onto it and raises the
number at the same time. I could have it in tonight. I would like a second opinion
before I do.

The simulation, the most recent nightly report, the retro extract and the workflow
are attached. Java 21, Maven, the build already runs on the nightly schedule.

## Output Specification

1. Rewrite `src/test/java/com/example/load/SignupSimulation.java` so that a
   recurrence of the 29 August behaviour makes the nightly build fail.
2. Write `docs/perf-88-response.md`: why the suite was green through the whole
   period, what number the last report actually establishes, and what you would
   say about Nathan's change.
3. Do not edit the report or the retro extract.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/load/SignupSimulation.java ===============
package com.example.load;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import java.time.Duration;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class SignupSimulation extends Simulation {

  HttpProtocolBuilder httpProtocol = http
    .baseUrl("https://staging.northwind-signup.internal")
    .acceptHeader("application/json");

  ScenarioBuilder signup = scenario("Merchant signup")
    .exec(
      http("Get token")
        .post("/auth/token")
        .body(StringBody("{\"client_id\":\"loadtest\",\"client_secret\":\"loadtest\"}"))
        .check(status().is(200))
        .check(jsonPath("$.access_token").saveAs("token"))
    )
    .exec(
      http("Create merchant")
        .post("/v1/merchants")
        .header("Authorization", "Bearer #{token}")
        .body(StringBody("{\"name\":\"Acme Trading\",\"country\":\"GB\",\"mcc\":\"5732\"}"))
        .check(status().is(201))
        .check(jsonPath("$.merchant_id").saveAs("merchantId"))
    )
    .exec(
      http("Submit KYC")
        .post("/v1/merchants/#{merchantId}/kyc")
        .header("Authorization", "Bearer #{token}")
        .body(StringBody("{\"doc_type\":\"passport\",\"doc_ref\":\"P-000001\"}"))
        .check(status().is(202))
    );

  {
    setUp(
      signup.injectClosed(
        rampConcurrentUsers(0).to(500).during(Duration.ofMinutes(2)),
        constantConcurrentUsers(500).during(Duration.ofMinutes(12))
      )
    )
    .protocols(httpProtocol)
    .assertions(
      global().failedRequests().percent().lt(1.0)
    );
  }
}

=============== FILE: reports/gatling-2026-09-11-summary.md ===============
# SignupSimulation - nightly, 2026-09-11, steady-state window (720s)

| Request         | Count  | Mean (ms) | p50  | p95  | p99  | KO    |
|-----------------|--------|-----------|------|------|------|-------|
| Get token       | 84,402 | 1384      | 1102 | 3488 | 5902 | 0.11% |
| Create merchant | 84,388 | 1620      | 1290 | 4106 | 7214 | 0.24% |
| Submit KYC      | 84,201 | 1002      |  844 | 2611 | 4402 | 0.41% |

Global: 252,991 requests in 720 s, mean 1336 ms, KO 0.25%.
Active users held at 500 for the whole window.

Assertions:

```
global failedRequests percent < 1.0 : OK
```

Build result: SUCCESS.

=============== FILE: docs/retro-2026-08-29.md ===============
# Retro extract - signup outage, 2026-08-29 (PERF-88)

## Timeline

- 14:02 marketing email lands, signup arrivals climb from ~40/s.
- 14:09 arrivals pass ~118/s. Queue depth on `signup-worker` starts climbing and
  never recovers. p95 on `POST /v1/merchants` goes from 340 ms to 26 s.
- 14:14 first 502s from the edge. 14:18 signup effectively closed.
- 15:00 arrivals fall below 90/s on their own; service recovers without a deploy.

Nothing was deployed on the 29th. The last signup deploy was the 21st.

## Discussion

> **Nathan:** the nightly holds 500 concurrent users and passes. That is the
> closed model, and the closed model is the wrong one for a public signup
> endpoint - every write-up on this says so. So put it on the open one and raise
> the number while we are there. Two lines:
>
> ```java
> signup.injectOpen(
>   rampUsers(2000).during(Duration.ofMinutes(10))
> )
> ```
>
> Open model, 2,000 users, ten minutes. I can push it tonight if somebody says go.

> **Priya:** we showed the September 7 report at the quarterly review as
> "signup sustains 500 concurrent merchants". Whatever we do, somebody is going
> to ask what that sentence was worth.

## Action

**PERF-88** - make the load test catch this. Owner: platform. Due 2026-09-18.

=============== FILE: .github/workflows/gatling.yml ===============
name: signup-load

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:
  pull_request:
    paths: ['src/test/java/**/*Simulation.java']

jobs:
  gatling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Run the simulation
        run: mvn -B gatling:test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gatling-report
          path: target/gatling/
          retention-days: 14
