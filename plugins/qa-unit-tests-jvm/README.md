# qa-unit-tests-jvm

JVM unit testing per-framework wrappers. Five skills covering Java + Kotlin + Scala + Groovy test frameworks, plus one orchestrator that authors a single test per spec by detecting the framework convention from the project's build file.

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
| Agent | [jvm-test-author](agents/jvm-test-author.md) | A2 | Authors one JVM unit test per spec; detects JUnit 5 / TestNG / Kotest / Spock / ScalaTest from pom.xml / build.gradle[.kts] / build.sbt; pairs with AssertJ when present |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-jvm@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
