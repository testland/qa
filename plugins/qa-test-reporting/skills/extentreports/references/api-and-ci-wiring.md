# ExtentReports richer API and test-lifecycle wiring

Deep reference for the extentreports SKILL.md. Consult for the richer report
API (hierarchical tests, category / author / device labels, exception capture,
code blocks) and for wiring the reporter into a JUnit 5 / TestNG run plus CI
artifact upload.

[wiki]: https://github.com/extent-framework/extentreports-java/wiki
[readme]: https://github.com/extent-framework/extentreports-java

## Hierarchical tests (parent / child)

Per [extent-wiki][wiki]:

```java
extent.createTest("ParentWithChild")
        .createNode("Child")
        .pass("This test is created as a toggle as part of a child test of 'ParentWithChild'");
```

The parent appears as a collapsible toggle in the report; children
nest underneath. Useful for grouping per-suite tests under a
suite-level node, or per-step interactions under a per-test node.

## Categories, authors, devices

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

## Exception capture

Per [extent-wiki][wiki]:

```java
extent.createTest("Exception")
        .fail(new RuntimeException("A runtime exception occurred!"));
```

Passing an exception to `.fail(...)` captures the message + full
stack trace in the report. Wire this into the test framework's
failure hook so every failed test gets the trace inline.

## Code blocks

Per [extent-wiki][wiki]:

```java
extent.createTest("CodeBlock").generateLog(
        Status.PASS,
        MarkupHelper.createCodeBlock(CODE1, CODE2));
```

`MarkupHelper.createCodeBlock(...)` produces syntax-highlighted
JSON / SQL / code blocks in the report - useful for capturing the
request body that triggered a failure.

## Wire into a JUnit 5 / TestNG run

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

## CI artifact upload

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
The HTML is for humans; keep emitting JUnit XML as the machine-readable
CI gate ([extent-readme][readme]) and surface the Spark HTML alongside it.
