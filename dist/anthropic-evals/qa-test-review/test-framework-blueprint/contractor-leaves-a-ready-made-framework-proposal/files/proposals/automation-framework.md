# Automation framework proposal - Meridian Dispatch

Author: D. Whitlock (contract, ended 2026-09-05)
Status: awaiting sign-off

## Stack

- Java 17, Maven
- Selenium WebDriver 4 + Cucumber-JVM 7, scenarios authored in Gherkin
- Page Object Model, three-level base class:
  `BaseTest` -> `WebTest` -> `DispatchTest`
- Executes on the existing internal grid (grid.meridian.internal, 24 nodes)
- Depends on `com.meridian.qa:qa-common:4.2.0`, the shared helper library the
  central QA group maintains for Meridian Fleet

## Coverage

| Layer   | Covered here                                  |
|---------|-----------------------------------------------|
| Unit    | No - owned by the dev teams, stays with them  |
| API     | No - out of scope for this phase              |
| Web E2E | Yes - all 31 console screens, one feature file per screen |

## Why this shape

This is the design I built at my previous client (a retail storefront), where
it grew to 640 UI scenarios over two years and held up. The grid is already
paid for. Gherkin means the operations managers can read the scenarios. And
the central QA group can maintain it, because they already own `qa-common`
and know this exact stack.

## Estimated build

Nine weeks, one engineer. Phase 1 is the harness and the three-level base
class; phase 2 is the 31 screen objects; phase 3 is the feature files.
