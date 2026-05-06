# qa-unit-tests-jvm

JVM unit testing per-framework wrappers. Five S1 skills covering Java + Kotlin + Scala + Groovy test frameworks.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [junit5-tests](skills/junit5-tests/SKILL.md) | S1 | JUnit 5 (Jupiter); modern JVM standard; @Test/@ParameterizedTest/@RepeatedTest; extension model |
| Skill | [kotest-tests](skills/kotest-tests/SKILL.md) | S1 | Kotlin-native; multi-style (StringSpec/FunSpec/BehaviorSpec); built-in property-based |
| Skill | [spock-tests](skills/spock-tests/SKILL.md) | S1 | Groovy BDD; given/when/then blocks; data tables; built-in mocking |
| Skill | [testng-tests](skills/testng-tests/SKILL.md) | S1 | Test method dependencies; groups; suite XML; legacy + Selenium-tradition |
| Skill | [scalatest](skills/scalatest/SKILL.md) | S1 | Scala-native; multi-style (FlatSpec/FunSuite/WordSpec); ScalaCheck pairing |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-jvm@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
