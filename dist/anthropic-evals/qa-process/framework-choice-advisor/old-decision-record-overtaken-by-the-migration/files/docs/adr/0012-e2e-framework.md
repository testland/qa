# 0012 - End-to-end test framework for the storefront

**Status:** accepted 2023-06-14

**Context:** The storefront service and both of its integration suites are
Maven and Java. All four engineers on the team author Java daily, and the
platform group already operates a Selenium Grid for two other services.

**Decision:** Selenium WebDriver with Java.

**Consequences:** Authoring stays in one language. Browser coverage is whatever
the Grid carries. Suite wall-clock grows with the Grid's node count rather than
with the runner, so speed is bought with hardware.

**Revisit when:**
- The storefront team stops authoring tests in Java.
- The full storefront suite passes 25 minutes of wall-clock time in CI.
