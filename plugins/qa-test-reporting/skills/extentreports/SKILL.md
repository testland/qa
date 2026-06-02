---
name: extentreports
description: "Configures ExtentReports v5 for Java / .NET test runs - wires `ExtentSparkReporter` (HTML), `attachReporter`, `createTest`, the log-level chain (`info`/`pass`/`warning`/`skip`/`fail`), screenshots via `MediaEntityBuilder`, hierarchical `createNode` parent/child tests, and category / author / device labels. Outputs a static HTML report alongside JUnit XML for CI artifact upload. Use when a JVM project (or .NET via `extentreports-dotnet`) wants a richer per-test report than JUnit XML and the team is on the Aventstack ExtentReports stack."
rating: 23
d6: 4
archetype: S1
---

# extentreports

## Overview

ExtentReports is a Java / .NET test reporting library - `ExtentReports`
holds the run; pluggable **reporters** (`ExtentSparkReporter` for
HTML, `ExtentKlovReporter` for the Klov server) consume the events
and produce the artifact ([extent-wiki][wiki]).

[wiki]: https://github.com/extent-framework/extentreports-java/wiki

> **Project status note** ([extent-readme][readme]): "ExtentReports
> is being sunset and will be replaced by ChainTest Framework." Teams
> already on ExtentReports v5 should plan a future migration; new
> projects should evaluate ChainTest first.

[readme]: https://github.com/extent-framework/extentreports-java

This skill covers the v5 API as documented in the official wiki.

## When to use

- A JVM (Java / Kotlin / Scala) test suite needs richer reporting
  than JUnit XML - screenshots inline, log levels, hierarchical
  parent/child tests.
- A .NET suite uses the sister `extentreports-dotnet` project (same
  API shape).
- The team has invested in ExtentReports tooling (Klov server,
  custom themes) and isn't ready to migrate to ChainTest.

If the team is starting fresh, evaluate **ChainTest** (the announced
successor per [extent-readme][readme]) before adopting ExtentReports.
For framework-agnostic richer reporting,
[`allure-reports`](../allure-reports/SKILL.md) covers similar ground
with broader language support.

## Step 1 - Install

Maven:

```xml
<dependency>
  <groupId>com.aventstack</groupId>
  <artifactId>extentreports</artifactId>
  <version>5.1.2</version>
</dependency>
```

Per [extent-readme][readme], v5.1.2 is the latest release as of
2024-06-26. Pin a version explicitly; the project is in maintenance
mode pending ChainTest.

## Step 2 - The canonical init pattern

Per the [extent-wiki][wiki] complete example:

```java
import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.MediaEntityBuilder;
import com.aventstack.extentreports.Status;
import com.aventstack.extentreports.markuputils.MarkupHelper;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;

public class Main {
    public static void main(String[] args) {
        ExtentReports extent = new ExtentReports();
        ExtentSparkReporter spark = new ExtentSparkReporter("target/Spark/Spark.html");
        extent.attachReporter(spark);
        // ... createTest calls ...
        extent.flush();
    }
}
```

Three load-bearing pieces:

1. **`new ExtentReports()`** - the run aggregator. Holds tests +
   metadata; emits to all attached reporters on `flush()`.
2. **`new ExtentSparkReporter("<path>")`** - the HTML reporter.
   Path is the output file.
3. **`extent.attachReporter(spark)`** - wires reporter to the run.

`extent.flush()` at the end of the run writes the report to disk.
**Without `flush()`, no file is written** - the most common new-user
mistake.

## Step 3 - Create tests + log levels

Per [extent-wiki][wiki]:

```java
extent.createTest("LogLevels")
        .info("info")
        .pass("pass")
        .warning("warn")
        .skip("skip")
        .fail("fail");
```

The chain reads top-to-bottom in the report. `info` is neutral;
`pass` / `fail` / `skip` set the test's overall status; `warning`
surfaces a yellow flag without changing status.

Each `createTest` returns an `ExtentTest`; calls on it accumulate
log entries. Multiple `createTest` calls on the same `extent`
produce multiple test entries in the report.

## Step 4 - Hierarchical tests (parent / child)

Per [extent-wiki][wiki]:

```java
extent.createTest("ParentWithChild")
        .createNode("Child")
        .pass("This test is created as a toggle as part of a child test of 'ParentWithChild'");
```

The parent appears as a collapsible toggle in the report; children
nest underneath. Useful for grouping per-suite tests under a
suite-level node, or per-step interactions under a per-test node.

## Step 5 - Screenshots + media

Per [extent-wiki][wiki]:

```java
extent.createTest("ScreenCapture")
        .addScreenCaptureFromPath("extent.png")
        .pass(MediaEntityBuilder.createScreenCaptureFromPath("extent.png").build());
```

Two patterns:

- **`.addScreenCaptureFromPath("...")`** - attaches the screenshot
  to the test as a top-level media entity.
- **`MediaEntityBuilder.createScreenCaptureFromPath("...").build()`
  passed to a status method** - attaches the screenshot to the
  specific log entry (the `.pass(...)` call here).

The latter pattern is preferred for failure screenshots: capture the
screenshot inside the test framework's `@AfterEach` failure hook
and pass it to `.fail(...)` so the failure log includes the visual
evidence inline.

## Step 6 - Categories / authors / devices

Per [extent-wiki][wiki]:

```java
extent.createTest("Tags").assignCategory("MyTag")
        .pass("The test 'Tags' was assigned by the tag MyTag");

extent.createTest("Authors").assignAuthor("TheAuthor")
        .pass("This test 'Authors' was assigned by a special kind of author tag.");

extent.createTest("Devices").assignDevice("TheDevice")
        .pass("This test 'Devices' was assigned by a special kind of devices tag.");
```

These metadata fields drive the report's filter sidebar - by tag,
author, device - making the report navigable when there are
hundreds of tests. Use:

- **Category** for feature / module / epic.
- **Author** for the test owner (auto-populated via custom code that
  reads `git blame`).
- **Device** for environment / browser / OS combinations.

## Step 7 - Exception capture

Per [extent-wiki][wiki]:

```java
extent.createTest("Exception")
        .fail(new RuntimeException("A runtime exception occurred!"));
```

Passing an exception to `.fail(...)` captures the message + full
stack trace in the report. Wire this into the test framework's
failure hook so every failed test gets the trace inline.

## Step 8 - Code blocks

Per [extent-wiki][wiki]:

```java
extent.createTest("CodeBlock").generateLog(
        Status.PASS,
        MarkupHelper.createCodeBlock(CODE1, CODE2));
```

`MarkupHelper.createCodeBlock(...)` produces syntax-highlighted
JSON / SQL / code blocks in the report - useful for capturing the
request body that triggered a failure.

## Step 9 - Wire into a JUnit 5 / TestNG run

JUnit 5 with a per-test extension:

```java
public class ExtentTestWatcher implements TestWatcher, BeforeAllCallback, AfterAllCallback {
    private static ExtentReports extent;

    @Override
    public void beforeAll(ExtensionContext ctx) {
        extent = new ExtentReports();
        extent.attachReporter(new ExtentSparkReporter("target/Spark/Spark.html"));
    }

    @Override
    public void testSuccessful(ExtensionContext ctx) {
        extent.createTest(ctx.getDisplayName()).pass("OK");
    }

    @Override
    public void testFailed(ExtensionContext ctx, Throwable cause) {
        extent.createTest(ctx.getDisplayName()).fail(cause);
    }

    @Override
    public void afterAll(ExtensionContext ctx) {
        extent.flush();   // critical
    }
}
```

Register via `@ExtendWith(ExtentTestWatcher.class)` on the test
class.

## Step 10 - CI artifact upload

```yaml
- run: ./mvnw -B verify

- name: Upload Extent report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: extent-report
    path: target/Spark/
    retention-days: 30
```

`if: always()` is critical - Extent matters most on failure runs.

## Anti-patterns

| Anti-pattern                                                      | Why it fails                                                              | Fix |
|-------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping `extent.flush()`                                         | No HTML file written; CI artifact step uploads an empty directory.        | Always call `flush()` in the suite-level teardown (Step 9). |
| One ExtentReports instance per test class (separate HTML files)    | Reports fragment across the run; reviewer has to open N files.            | One per run; use Categories to navigate (Step 6). |
| Logging assertion details without screenshots on UI tests          | Failure context is missing the visual; debugging requires reproducing.   | `MediaEntityBuilder` on every `.fail(...)` (Step 5). |
| ExtentReports as a substitute for JUnit XML in CI gating           | The HTML is for humans; CI gates need machine-readable XML.              | Emit both; gate on JUnit XML; surface Extent as artifact. |
| Hard-coded category / author strings                                | Drift; renames don't propagate; filter list grows polluted.              | Author a small enum / constants class; reference centrally. |
| Adopting ExtentReports for a new project in 2026+                  | Project is sunset per [extent-readme][readme]; you'll migrate later.    | Evaluate ChainTest (announced successor) or `allure-reports`. |
| Manually computing pass/fail counts vs trusting the reporter        | Reporter aggregates from the events; manual count drifts.                 | Read the `extent.flush()`-emitted `extent.json` for programmatic access. |

## Limitations

- **Sunset.** Per [extent-readme][readme], the framework is being
  replaced by ChainTest. v5 will receive bug fixes but not new
  features.
- **HTML output is the artifact.** Programmatic post-processing
  requires reading the `extent.json` companion file (auto-emitted)
  rather than parsing the HTML.
- **No native PR-comment integration.** The HTML is a CI artifact;
  posting a summary to the PR requires a separate step (e.g. parse
  `extent.json`, format markdown, post via `gh pr comment`).
- **Klov server is a separate runtime** with its own deploy /
  storage requirements. Most teams stick with file-based Spark.

## References

- [extent-readme][readme] - repo overview, latest version (5.1.2),
  sunset notice (replacing with ChainTest).
- [extent-wiki][wiki] - wiki home with the "complete example" code
  cited throughout this skill.
- [`allure-reports`](../allure-reports/SKILL.md) - framework-agnostic
  alternative with broader language support (and not sunset).
- [`junit-xml-analysis`](../junit-xml-analysis/SKILL.md) - pair with
  ExtentReports for CI gating; the JUnit XML is the gate, the
  Spark HTML is the human-readable artifact.
