---
name: extentreports
description: "Configures ExtentReports v5 for a JVM (or .NET via `extentreports-dotnet`) test run: wires `ExtentSparkReporter`, `attachReporter`, `createTest`, the `info`/`pass`/`warning`/`skip`/`fail` log chain, screenshots via `MediaEntityBuilder`, hierarchical `createNode` parent/child tests, and category/author/device labels, emitting a static HTML report alongside JUnit XML for CI artifact upload. Use when a suite on the Aventstack ExtentReports stack wants a richer per-test HTML narrative than JUnit XML gives; for code-coverage reporting use jacoco-analysis, and for hosted cross-run flakiness analytics use currents-integration."
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
`allure-reports` covers similar ground
with broader language support.

## How to use

1. Add the `extentreports` dependency (or `extentreports-dotnet` for
   .NET) and pin the version.
2. Create an `ExtentReports`, attach an `ExtentSparkReporter("<path>")`,
   and call `extent.flush()` at the end of the run - without `flush()`
   no file is written.
3. Per test, `createTest(name)` then chain log levels
   (`info` / `pass` / `warning` / `skip` / `fail`); attach failure
   screenshots via `MediaEntityBuilder`.
4. Wire the reporter into your JUnit 5 / TestNG lifecycle and upload
   the HTML as a CI artifact - the lifecycle extension, the richer
   report API (hierarchical tests, category / author / device labels,
   exception capture, code blocks), and CI upload are in
   [references/api-and-ci-wiring.md](references/api-and-ci-wiring.md).

## Install

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

## Initialize the report

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

## Create tests and log levels

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

## Screenshots and media

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

## Worked example

A minimal runnable report with one passing test, the log-level chain,
and a screenshot inlined on the `pass` entry:

```java
import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.MediaEntityBuilder;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;

public class Demo {
    public static void main(String[] args) {
        ExtentReports extent = new ExtentReports();
        extent.attachReporter(new ExtentSparkReporter("target/Spark/Spark.html"));

        extent.createTest("checkout adds item")
              .info("navigated to cart")
              .pass("item added",
                    MediaEntityBuilder.createScreenCaptureFromPath("cart.png").build());

        extent.flush();   // writes target/Spark/Spark.html - omit it and nothing is written
    }
}
```

Open `target/Spark/Spark.html` in a browser: the test shows the
`info` and `pass` log lines top-to-bottom with the screenshot inlined
on the `pass` entry.

## Operating in CI

ExtentReports HTML is a human artifact, not a CI gate - keep emitting
JUnit XML for the gate and upload the Spark HTML alongside it.
Register the reporter through a JUnit 5 `TestWatcher` (or TestNG
listener) so every pass/fail is logged and `flush()` runs in the
suite teardown, then upload `target/Spark/` with `if: always()`
(Extent matters most on failure runs). The lifecycle extension and
the artifact-upload step are in
[references/api-and-ci-wiring.md](references/api-and-ci-wiring.md).

## Anti-patterns

| Anti-pattern                                                      | Why it fails                                                              | Fix |
|-------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping `extent.flush()`                                         | No HTML file written; CI artifact step uploads an empty directory.        | Always call `flush()` in the suite-level teardown (see Operating in CI). |
| One ExtentReports instance per test class (separate HTML files)    | Reports fragment across the run; reviewer has to open N files.            | One per run; use Categories to navigate (see the richer-API reference). |
| Logging assertion details without screenshots on UI tests          | Failure context is missing the visual; debugging requires reproducing.   | `MediaEntityBuilder` on every `.fail(...)` (see Screenshots and media). |
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
- [references/api-and-ci-wiring.md](references/api-and-ci-wiring.md) -
  hierarchical tests, category / author / device labels, exception
  capture, code blocks, and the JUnit 5 / TestNG + CI wiring.
- `allure-reports` - framework-agnostic
  alternative with broader language support (and not sunset).
- `junit-xml-analysis` - pair with
  ExtentReports for CI gating; the JUnit XML is the gate, the
  Spark HTML is the human-readable artifact.
