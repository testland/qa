---
name: api-testing-overview
description: "Teaches API testing from zero: what functional API testing covers, how it differs from contract testing and load testing, and a decision table that picks one tool from observable project facts (language and build file, whether an OpenAPI or GraphQL schema exists, functional vs spec-conformance fuzzing vs stateful security fuzzing, whether non-engineers read the tests). Names the real options (Postman with newman, REST Assured, Karate, Tavern, Schemathesis, RESTler), gives install and first-run commands with what a passing run looks like, and the traps that bite first: asserting only on HTTP status, order-dependent tests sharing server state, and hardcoded environment URLs and secrets. Use when an HTTP API needs automated tests and no tool has been chosen, or when an inherited suite only checks status codes."
---

# api-testing-overview

## What API testing covers

An API test sends a real HTTP request to a running service and asserts on the
response: the status code, the headers, and the body. It is not a unit test
(no in-process function calls, no mocking the HTTP layer) and not a UI test
(no browser). It exercises one deployed service through its public interface,
so it catches serialization bugs, wrong status codes, missing fields, broken
auth, and schema drift that unit tests structurally cannot see.

Three consequences shape everything below. The service runs at some URL, so
environment configuration is a first-class concern. The service has state, so
two tests hitting the same database can interfere. And the response is data
rather than a return value, so how well you assert on it is the whole skill.

## Functional vs contract vs load: three different disciplines

Newcomers merge these three and then pick a tool that cannot do the job. They
answer different questions and use different tools.

| Question you are actually asking | Discipline | Typical tools |
|---|---|---|
| Does `GET /orders/42` return 200 with the right body, and 404 when it is missing? | Functional API testing | Postman/newman, REST Assured, Karate, Tavern, Schemathesis, RESTler |
| Will the consumer service still work when the provider deploys tomorrow? | Contract testing | Pact |
| Does the service hold up at 500 requests per second for 30 minutes? | Load / performance testing | k6, JMeter |

**Functional** is what this skill teaches. One service, one live URL, request
in, assertions on the response.

**Contract testing** is a separate discipline: no shared environment is
involved. Pact generates the contract during the consumer's own test run and
replays those concrete request/response pairs against the provider in the
provider's CI, so teams confirm two services still agree without deploying both
together ([docs.pact.io](https://docs.pact.io/)). If your problem is "team A's
deploy broke team B", functional API tests will not solve it, because they test
one side at a time.

**Load testing** varies concurrency and duration, then reports latency
percentiles and error rates. k6
([grafana.com/docs/k6](https://grafana.com/docs/k6/latest/)) and Apache JMeter
([jmeter.apache.org](https://jmeter.apache.org/)) are the usual tools. A
functional suite run in a loop is not a load test: no concurrency model, no
ramp, no latency reporting.

A healthy project usually has all three eventually. Start with functional.

## Choosing a tool

Read down the "What you can observe" column and stop at the first row that
matches your project. Every row names a tool you can install today.

| What you can observe | Your goal | Start with | Why this one |
|---|---|---|---|
| `pom.xml` or `build.gradle`, tests already run under JUnit, engineers write and read the tests | Functional | **REST Assured** | Tests are plain Java in the existing `src/test/java` tree, so the build, CI, and IDE already work. No new runtime. |
| JVM project, but testers or analysts who do not write Java must read or edit the tests | Functional | **Karate** | Tests are `.feature` files in Gherkin shape and are directly executable: no step-definition glue code to maintain ([github.com/karatelabs/karate](https://github.com/karatelabs/karate)). |
| `package.json`, or the team already has a Postman collection JSON in the repo | Functional | **Postman + newman** | Author in the GUI, run the exact same collection headlessly in CI with `newman run` ([github.com/postmanlabs/newman](https://github.com/postmanlabs/newman)). |
| `requirements.txt` or `pyproject.toml`, pytest is already the runner | Functional | **Tavern** | Tests are YAML files collected by pytest itself, so existing pytest fixtures, markers, and reporting keep working ([tavern.readthedocs.io](https://tavern.readthedocs.io/en/stable/)). |
| An OpenAPI (2.0/3.x) or GraphQL schema is committed or served, and you want broad coverage without hand-writing per-endpoint tests | Spec conformance | **Schemathesis** | It "tests OpenAPI and GraphQL APIs by generating inputs from your schema" ([github.com/schemathesis/schemathesis](https://github.com/schemathesis/schemathesis)). Coverage grows automatically as the schema grows. |
| An OpenAPI spec **and** the API is a resource lifecycle (`POST` creates, `GET` reads, `DELETE` removes), and you want security and reliability bugs | Stateful fuzzing | **RESTler** | "the first stateful REST API fuzzing tool ... finding security and reliability bugs", inferring request dependencies to reach deeper service states ([github.com/microsoft/restler-fuzzer](https://github.com/microsoft/restler-fuzzer)). |
| Consumer and provider are separate deployables owned by different teams | Contract | **Pact** | See the section above. Not a functional-testing problem. |
| The requirement mentions users per second, throughput, latency, or an SLA | Load | **k6** | See the section above. Not a functional-testing problem. |

Tie-breakers when two rows match:

- **Match the service's own language** unless a row above overrides it. Your CI
  image already has that runtime, and the people fixing failures already read
  that language.
- **A schema flips the answer only for coverage goals.** Having an OpenAPI file
  does not mean you should skip hand-written tests. Schemathesis checks that
  responses conform to the schema; it does not check that the business answer
  is correct. Most teams end up with a small hand-written suite plus
  Schemathesis, not one instead of the other.
- **Fuzzers are additive, never first.** Schemathesis and RESTler tell you the
  API violated its own spec or returned 5xx. They cannot tell you `/orders/42`
  returned the wrong customer. Get a functional suite green first.
- **If nothing matches**, use Postman and newman. It needs only Node, works
  against any HTTP API, and the collection JSON is portable if you later
  migrate.

## First runnable path

Below is the shortest path to one passing test for each functional option.
Pick the row you landed on. Point `baseUrl` at a locally running service or a
staging instance, never production.

### Postman and newman (default if unsure)

In the **Tests** tab of a request, assert both the status and the body
([learning.postman.com](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/)):

```js
pm.test("Status test", function () {
    pm.response.to.have.status(200);
});

pm.test("body has expected field", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
});
```

Then run the saved collection headlessly
([github.com/postmanlabs/newman](https://github.com/postmanlabs/newman)):

```bash
npm install -g newman
newman run collection.json -e environment.json -r cli,junit
```

`-e/--environment` supplies "a set of variables that one can use within
collections"; `-r/--reporters` accepts `cli, json, junit, progress and
emojitrain` (same source). `junit` is the one CI ingests.

**Success looks like:** newman prints an assertions table with 0 failures and
exits 0. Verify it can fail: change `200` to `201`, rerun, confirm a non-zero
exit.

First-run commands for the other functional options - REST Assured, Karate,
Tavern, Schemathesis, and RESTler - are in
[references/first-run-commands.md](references/first-run-commands.md). Each gives
the install, one passing test, and how to make it fail.

## Traps that bite first

**1. Asserting only on the status code.** A handler that catches its own
exception and returns `200 {"error": "user not found"}` passes a status-only
test forever. So does an endpoint that starts returning an empty array. Assert
on at least one field of the body too, which is why the Postman docs' own
example pairs a status assertion with a body assertion
([learning.postman.com](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/)).
The counterpart trap is over-asserting: pinning a server-generated `id` or
timestamp to a literal fails on every run. Assert the type, not the value, via
Karate's `'#number'` placeholder
([docs.karatelabs.io](https://docs.karatelabs.io/)) or a Hamcrest matcher such
as `notNullValue()` ([rest-assured wiki](https://github.com/rest-assured/rest-assured/wiki/Usage)).

**2. Tests that only pass in one order.** Unlike unit tests, API tests share a
live database. Test 1 creates `alice@example.com`, test 2 asserts the user
count is 3, test 3 deletes Alice. Run them alone, shuffled, or in parallel and
they fail. Symptoms: "it passes locally but not in CI", or a test that fails
only when you run the file directly. The fixes, in order of preference:

- Each test creates the data it needs with a unique key (a UUID or timestamp
  suffix in the email), and asserts only on that record.
- Never assert on global aggregates (total counts, "the first item in the
  list") unless the test owns the whole dataset.
- Clean up in teardown, but do not depend on cleanup having run.
- Detect the problem deliberately: reverse the file order or run in parallel
  and see whether the suite still passes. This ordering check is a
  practitioner convention, not a documented tool feature.

**3. Hardcoded environment URLs and secrets.** `https://staging.example.com`
pasted into 40 requests means the suite can never run anywhere else, and a
token committed in a collection is a leak that survives in git history. Every
tool in the table has a supported mechanism, so use it from the first test:

| Tool | Base URL | Secret |
|---|---|---|
| Postman/newman | environment file via `-e` ([github.com/postmanlabs/newman](https://github.com/postmanlabs/newman)) | environment variable in the same file, injected from CI secrets |
| REST Assured | `baseUri(System.getenv("API_BASE_URL"))` | `System.getenv` in the test |
| Karate | a variable read from a system property, e.g. `karate.properties['api.token']` ([docs.karatelabs.io](https://docs.karatelabs.io/)) | same mechanism, passed as `-D` on the Maven command |
| Tavern | a `{host}` format variable supplied by an included config file ([github.com/taverntesting/tavern](https://github.com/taverntesting/tavern)) | same mechanism, sourced from the environment |
| Schemathesis | `schemathesis run <schema-url>` where the URL is a CI variable ([github.com/schemathesis/schemathesis](https://github.com/schemathesis/schemathesis)) | auth header passed on the command line from a CI secret |

A useful rule: if `grep -rE 'https?://|Bearer ' tests/` returns anything, the
suite is not yet environment-portable.

**4. Pointing any of it at production.** Functional tests create and delete
data, and fuzzers do so at volume, generating requests designed to be unusual.
Target a local instance or staging.

## Going deeper

Per-tool deep dives live in sibling skills in this plugin:
`postman-collections`,
`restassured-testing`,
`karate-testing`,
`tavern-testing`,
`schemathesis-fuzzing`,
`restler-fuzzing`,
`api-chaos-runner`.
