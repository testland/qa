---
name: xray-integration
description: "Imports CI test results into Xray for Jira - authenticates via the `client_id` + `client_secret` → JWT exchange (Cloud) or PAT / Basic (Server), posts to the format-specific `/api/v2/import/execution/*` endpoint (`/junit` for JUnit XML, `/cucumber` for Cucumber JSON, `/nunit` / `/testng` / `/robot` for the others), and maps automated results to existing Xray Test issues via the `xray-junit-extensions` `@XrayTest(key=\"...\")` annotation. Use when the team uses the Xray Jira app to manage Test, Test Set, and Test Execution issue types and CI must keep those execution issues in sync; for the other Jira TCM app use zephyr-integration (Zephyr Scale), for standalone non-Jira TestRail use testrail-integration, and for hosted cross-run flakiness analytics rather than TCM sync use currents-integration."
---

# xray-integration

## Overview

Xray exposes test cases / executions as **Jira issue types** (Test,
Test Set, Test Plan, Test Execution, Pre-Condition) - automated test
sync writes results into Test Execution issues.

Xray comes in two flavors:

| Flavor             | Auth                             | Import endpoints                                |
|--------------------|----------------------------------|-------------------------------------------------|
| **Xray Cloud**     | `client_id` + `client_secret` → JWT | `https://xray.cloud.getxray.app/api/v2/import/...` |
| **Xray Server / DC** | Jira PAT or Basic auth          | `https://<jira>/rest/raven/2.0/import/...`        |

This skill covers the **Cloud** flow as the primary path; Server
notes are inline.

The official documentation is at **`docs.getxray.app`**. At the
time of authoring (2026-05-05), the Cloud import-results page was
403 to automated WebFetch; the URL is the canonical reference for
real-browser navigation. The well-known endpoints + payload shapes
below are documented in the official **`xray-junit-extensions`**
GitHub repo ([xray-junit-ext][xje]) and the **`xray-postman-collections`**
public collections, both first-party Xray-App tools.

[xje]: https://github.com/Xray-App/xray-junit-extensions

## When to use

- The team uses Jira and Xray for test management; automated runs
  must keep Test Execution issues in sync.
- A regression run needs to update existing Test issues with the
  latest pass/fail (vs creating ad-hoc execution records).
- Jira-side issue links (Test → Story / Bug coverage) need automation
  results to flow.

## How to use

1. Determine the flavor - Xray Cloud vs Server / DC - since it sets the auth
   model and import host (Overview table).
2. Authenticate: Cloud exchanges `client_id` + `client_secret` for a 24h JWT;
   Server / DC uses a Jira PAT or Basic auth (Step 1).
3. Pick the import endpoint that matches your runner's output format
   (`/junit`, `/cucumber`, `/testng`, `/nunit`, `/robot`, or generic JSON)
   (Step 2).
4. Pin each test method to an existing Test issue with `@XrayTest(key=...)`
   (and `@Requirement` for coverage) so renames don't orphan issues (Step 3).
5. Emit Xray-extended output - JVM via `xray-junit-extensions` (Step 5),
   JavaScript via the official Playwright reporter (references).
6. POST the results with `projectKey=...`, adding `testExecKey=...` to update
   an existing Test Execution instead of creating a new one (Step 7).
7. Wire it as an `if: always()` CI step - full workflow and the non-JVM path
   in [references/ci-and-non-jvm.md](references/ci-and-non-jvm.md).

## Step 1 - Authenticate (Cloud)

Per the [xray-junit-ext][xje] reference, Cloud auth is a two-step
flow:

```bash
# 1. Exchange credentials for a JWT
JWT=$(curl -X POST 'https://xray.cloud.getxray.app/api/v2/authenticate' \
  -H 'Content-Type: application/json' \
  -d '{"client_id": "'"$XRAY_CLIENT_ID"'", "client_secret": "'"$XRAY_CLIENT_SECRET"'"}' \
  | tr -d '"')

# 2. Use the JWT in subsequent requests
curl -X POST 'https://xray.cloud.getxray.app/api/v2/import/execution/junit' \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/xml' \
  --data-binary @junit.xml
```

The JWT has a **24-hour validity** (well-documented across Xray API
clients); refresh per CI run.

For **Xray Server / DC**, use a Jira PAT or Basic auth instead;
the JWT step is skipped.

## Step 2 - Pick the import endpoint per format

| Test runner output       | Cloud endpoint                                             |
|--------------------------|------------------------------------------------------------|
| JUnit XML (Maven, Gradle, Jest, pytest, etc.) | `/api/v2/import/execution/junit`         |
| Cucumber JSON            | `/api/v2/import/execution/cucumber`                        |
| TestNG XML               | `/api/v2/import/execution/testng`                          |
| NUnit XML (.NET)         | `/api/v2/import/execution/nunit`                           |
| xUnit XML (.NET)         | `/api/v2/import/execution/xunit`                           |
| Robot Framework XML      | `/api/v2/import/execution/robot`                           |
| Generic JSON (Xray-shape)| `/api/v2/import/execution`                                 |

Each endpoint accepts the format's native output and parses it
server-side; no per-test pre-mapping is needed.

For the **generic JSON** endpoint, payload shape:

```json
{
  "info": {
    "summary": "CI run for ABC-123",
    "description": "Automated regression run",
    "user": "ci-runner",
    "version": "1.4.5",
    "revision": "abc1234",
    "testPlanKey": "PROJ-100",
    "testEnvironments": ["staging", "chrome"]
  },
  "tests": [
    {
      "testKey": "PROJ-1234",
      "start": "2026-05-05T14:00:00Z",
      "finish": "2026-05-05T14:00:12Z",
      "comment": "Test passed cleanly",
      "status": "PASSED"
    }
  ]
}
```

## Step 3 - Map test methods to Xray Test issues

Per [xray-junit-ext][xje], the JUnit 5/6 extension provides two
annotations:

### `@XrayTest`

> "enforce mapping of result to specific, existing Test identified
> by issue key, using the **key** attribute" ([xray-junit-ext][xje])

```java
@Test
@XrayTest(key = "CALC-1000")
public void canAddNumbers() { /* ... */ }
```

Without `@XrayTest`, the extension auto-creates a Test issue per
JUnit method on first run (auto-provisioning). Pinning with `key`
prevents drift across renames.

### `@Requirement`

> "identify the covered requirement(s) ... it's possible to identify
> one covered issue or more" ([xray-junit-ext][xje])

```java
@Test
@Requirement("CALC-1234")
public void canAddNumbers() { /* ... */ }
```

This populates the Jira-side coverage link from the test back to
the requirement issue.

## Step 4 - `XrayTestReporter` for evidence

Per [xray-junit-ext][xje], the `XrayTestReporterParameterResolver`
extension injects an `XrayTestReporter` into test methods:

> "Add comments to Test Runs / Define Test Run custom field values
> / Attach evidence files" ([xray-junit-ext][xje])

```java
@Test
@ExtendWith(XrayTestReporterParameterResolver.class)
@XrayTest(key = "CALC-1000")
public void canAddNumbers(XrayTestReporter reporter) {
    // ... test logic ...
    reporter.addComment("Calculator returned correct sum");
    reporter.addEvidence("screenshot.png");
}
```

Evidence files are attached to the Test Run inside the Test Execution
issue - useful for failure debugging from Jira.

## Step 5 - Configure the extension

Per [xray-junit-ext][xje], the extension reads `xray-junit-extensions.properties`
for output config:

```properties
# xray-junit-extensions.properties (place on the test classpath)
report_filename=TEST-results
report_directory=target/xray-reports
add_timestamp_to_report_filename=false
```

The output is JUnit XML augmented with Xray-specific metadata; pass
this enriched XML to the import endpoint (Step 2).

## Step 6 - Operating in CI

Run the import as an `if: always()` step after the test step so failed
runs still reach Xray. Fetch a fresh JWT (Step 1), mask it
(`::add-mask::`), then POST the Xray-extended JUnit XML to
`/api/v2/import/execution/junit?projectKey=<KEY>` - `projectKey` (the
Jira project key) is the critical query param; without it the import
fails or lands in the wrong project. JVM suites emit the enriched XML via
`xray-junit-extensions` (Step 5); non-JVM teams use the official
Playwright reporter. The full GitHub Actions workflow and the Playwright
reporter setup are in
[references/ci-and-non-jvm.md](references/ci-and-non-jvm.md).

## Step 7 - Test Execution issue lifecycle

By default, each import creates a **new** Test Execution issue.
For "update an existing execution per build" (e.g. one execution per
release branch), pass `testExecKey=PROJ-XYZ` in the query string:

```
POST /api/v2/import/execution/junit?projectKey=CALC&testExecKey=CALC-9999
```

Pattern:

- **PR runs**: new Test Execution per push (lots of issues; auto-archive
  via Jira workflow after PR merge).
- **Release runs**: one Test Execution per release branch; updated on
  every push (uses `testExecKey`).

## Worked example

A Maven + JUnit 5 suite syncing one release run to Jira project `CALC`:

1. The test method is pinned to an existing Test issue (Step 3):

```java
@Test
@XrayTest(key = "CALC-1000")
public void canAddNumbers() { /* ... */ }
```

2. `xray-junit-extensions.properties` (Step 5) writes the enriched XML to
   `target/xray-reports/TEST-results.xml`.
3. CI fetches a JWT, then imports against a single per-release execution:

```bash
curl -X POST 'https://xray.cloud.getxray.app/api/v2/import/execution/junit?projectKey=CALC&testExecKey=CALC-9999' \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/xml' \
  --data-binary @target/xray-reports/TEST-results.xml
```

The result lands in Test Execution `CALC-9999` with `CALC-1000` marked
Passed. PR runs omit `testExecKey` to get a fresh execution per push
(Step 7).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Auto-provisioning Test issues without `@XrayTest(key=...)`            | Renaming a test method creates a new Test issue; old one orphans.        | Pin every test method to an existing issue with `@XrayTest(key="...")` (Step 3). |
| Storing JWT secret in repo / log                                       | Cloud secret leak; immediate quota abuse.                                 | Mask in CI; fetch fresh per run; never log (Step 6 `::add-mask::`). |
| Importing without `projectKey`                                          | Import lands in default project; other teams see your tests.             | Always pass `projectKey` (Step 6). |
| New Test Execution per PR push                                         | 100+ Jira issues per active PR; project clutter.                          | Reuse `testExecKey` per PR; create new only on push to main (Step 7). |
| Using regular JUnit XML reporter (not the Xray-extended one)            | Loses `@XrayTest` / `@Requirement` annotations; mapping fails.           | Use `xray-junit-extensions` for JVM (Step 5) or the official Playwright reporter (references). |
| Long-lived JWT cache (>24h)                                             | Auth fails; CI runs broken silently.                                      | Fetch JWT per run; respect the 24h validity. |
| Importing 5,000 results in one request                                  | Server times out; partial state.                                          | Split per suite or per Test Execution; Xray Cloud's import endpoints are sized for typical CI batches. |

## Limitations

- **Cloud and Server have different endpoints + auth.** Don't share
  scripts; maintain per-flavor variants.
- **Auto-provisioning creates issues in the project.** Heavy
  auto-provisioning can balloon Jira project size; pre-create Test
  issues via the Xray UI or `xray-postman-collections` for a
  pre-seeded suite.
- **No first-party Cypress reporter** in the Xray-App org; the
  community-maintained `cypress-xray-junit-reporter` is the de-facto
  choice but isn't officially supported.
- **Documentation domain is JS-rendered + auth-gated.** Per the
  source-fetch failure documented in this skill (2026-05-05), the
  primary canonical references for the import API require real
  browser navigation; the GitHub repos under
  `https://github.com/Xray-App/` are the most reliable
  programmatically-fetchable sources.

## References

- [xray-junit-ext][xje] - official `xray-junit-extensions` repo:
  `@XrayTest(key=...)`, `@Requirement(...)`, `XrayTestReporter`
  injection, `xray-junit-extensions.properties` config.
- `https://github.com/Xray-App/xray-postman-collections` - official
  Postman collections for every Xray Cloud public API endpoint
  (including `/api/v2/authenticate` and `/api/v2/import/execution/*`).
- `https://github.com/Xray-App/xray-maven-plugin` - Maven-side
  integration with the same import + auth shape.
- `https://github.com/Xray-App/playwright-junit-reporter` - official
  Playwright reporter for Xray-compatible JUnit XML.
- [references/ci-and-non-jvm.md](references/ci-and-non-jvm.md) - the
  end-to-end CI workflow (JWT fetch + import) and the non-JVM Playwright
  reporter setup.
- `https://docs.getxray.app/` - canonical doc portal (auth/region-gated;
  consult in a real browser).
- `junit-xml-analysis` - same
  upstream as the JUnit-flavored Xray import.
- `testrail-integration`,
  `zephyr-integration` - sibling
  test-management integrations.
