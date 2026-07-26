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

## Step 6 - End-to-end CI shape

```yaml
# .github/workflows/xray-sync.yml
- name: Run tests with Xray-aware JUnit reporter
  run: ./mvnw -B verify
  # Produces target/xray-reports/TEST-results.xml

- name: Get Xray JWT
  id: xray_auth
  env:
    XRAY_CLIENT_ID: ${{ secrets.XRAY_CLIENT_ID }}
    XRAY_CLIENT_SECRET: ${{ secrets.XRAY_CLIENT_SECRET }}
  run: |
    JWT=$(curl -s -X POST 'https://xray.cloud.getxray.app/api/v2/authenticate' \
      -H 'Content-Type: application/json' \
      -d '{"client_id":"'"$XRAY_CLIENT_ID"'","client_secret":"'"$XRAY_CLIENT_SECRET"'"}' \
      | tr -d '"')
    echo "::add-mask::$JWT"
    echo "jwt=$JWT" >> "$GITHUB_OUTPUT"

- name: Import to Xray
  if: always()
  run: |
    curl -X POST 'https://xray.cloud.getxray.app/api/v2/import/execution/junit?projectKey=CALC' \
      -H "Authorization: Bearer ${{ steps.xray_auth.outputs.jwt }}" \
      -H 'Content-Type: application/xml' \
      --data-binary @target/xray-reports/TEST-results.xml
```

`projectKey=CALC` (the Jira project key) is the critical query
param - without it, the import fails or lands in the wrong project.

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

## Step 8 - `tutorial-js-playwright` for non-JVM teams

Per the Xray-App GitHub org, the [`playwright-junit-reporter`][pwj]
project ships a Playwright reporter that emits Xray-compatible JUnit
XML. JavaScript teams use:

[pwj]: https://github.com/Xray-App/playwright-junit-reporter

```typescript
// playwright.config.ts
reporter: [
  ['list'],
  ['@xray-app/playwright-junit-reporter', {
    outputFile: 'target/xray-reports/results.xml',
  }],
],
```

Then the same Step 6 import endpoint consumes the output.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Auto-provisioning Test issues without `@XrayTest(key=...)`            | Renaming a test method creates a new Test issue; old one orphans.        | Pin every test method to an existing issue with `@XrayTest(key="...")` (Step 3). |
| Storing JWT secret in repo / log                                       | Cloud secret leak; immediate quota abuse.                                 | Mask in CI; fetch fresh per run; never log (Step 6 `::add-mask::`). |
| Importing without `projectKey`                                          | Import lands in default project; other teams see your tests.             | Always pass `projectKey` (Step 6). |
| New Test Execution per PR push                                         | 100+ Jira issues per active PR; project clutter.                          | Reuse `testExecKey` per PR; create new only on push to main (Step 7). |
| Using regular JUnit XML reporter (not the Xray-extended one)            | Loses `@XrayTest` / `@Requirement` annotations; mapping fails.           | Use `xray-junit-extensions` for JVM (Step 5) or the official Playwright reporter (Step 8). |
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
- `https://docs.getxray.app/` - canonical doc portal (auth/region-gated;
  consult in a real browser).
- `junit-xml-analysis` - same
  upstream as the JUnit-flavored Xray import.
- `testrail-integration`,
  `zephyr-integration` - sibling
  test-management integrations.
