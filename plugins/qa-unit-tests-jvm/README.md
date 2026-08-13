# qa-unit-tests-jvm

JVM unit testing in one umbrella skill: JUnit 5 as the primary framework
for Java / Kotlin / Scala / Groovy codebases, with a per-language framework
decision table and Kotest, Spock, TestNG, ScalaTest, and AssertJ as bundled
references.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [jvm-unit-tests](skills/jvm-unit-tests/SKILL.md) | JUnit 5 annotations / lifecycle / parameterized tests / extensions / parallel config / JaCoCo / CI, framework choice (Java → JUnit 5, Kotlin → Kotest, Groovy → Spock, Scala → ScalaTest, legacy → TestNG), and test-authoring conventions; references cover Kotest, Spock, TestNG, ScalaTest, and AssertJ |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-jvm@testland-qa
```
