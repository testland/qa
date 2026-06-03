---
component: jvm-test-author
type: agent
---

# jvm-test-author - evals

Companion eval cases for [`jvm-test-author`](../../jvm-test-author.md). Three
cases covering happy path + branch + adversarial. Re-run by feeding the
**Input** block as the first user message to the agent and comparing the
emitted test file against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date - 
each eval is designed to be re-run against each tier.

## Eval 1 - happy path - Maven + JUnit 5 → @Test + Assertions.assertTrue(result.isEmpty())

**Input:**

```
Author a JVM unit test for this target method.

Target class + method signature:
  com.acme.users.UserService.findById(UUID id) -> Optional<User>
  (declared in src/main/java/com/acme/users/UserService.java)
Behavior spec: "Given an empty in-memory repo, when findById is called
                with any UUID, then the returned Optional is empty."
Project root: . (contains pom.xml at the root)

pom.xml dependencies (excerpt):
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter-api</artifactId>
  <version>5.10.0</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter-engine</artifactId>
  <version>5.10.0</version>
  <scope>test</scope>
</dependency>
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Detects Java + Maven + JUnit 5 (from `junit-jupiter-api`).
Emits ONE test file at `src/test/java/com/acme/users/UserServiceTest.java`
with `import org.junit.jupiter.api.Test;`, a `@Test`-annotated method,
optional `@DisplayName`, and `Assertions.assertTrue(result.isEmpty())` (or
`assertFalse(result.isPresent())`). Does NOT introduce TestNG, Kotest,
Spock, or ScalaTest imports. Does NOT add AssertJ (`org.assertj:assertj-core`
is not in dependencies) unless explicitly noting it as an optional
enhancement.

**Pass condition:** Output contains the literal strings
`org.junit.jupiter.api.Test`, `@Test`, AND one of
`assertTrue(result.isEmpty())` / `assertFalse(result.isPresent())` /
`assertEquals(Optional.empty(), result)`. Output filename ends in
`UserServiceTest.java` under `src/test/java/`. Output does NOT contain
`org.testng`, `io.kotest`, `spock.lang`, OR `org.scalatest`.

## Eval 2 - branch - Gradle Kotlin DSL + Kotest runner → StringSpec + shouldBe

**Input:**

```
Author a JVM unit test for this target method.

Target class + method signature:
  com.acme.users.UserService.findById(id: UUID): User?
  (declared in src/main/kotlin/com/acme/users/UserService.kt)
Behavior spec: "Given an empty in-memory repo, when findById is called
                with any UUID, then the function returns null."
Project root: . (contains build.gradle.kts at the root)

build.gradle.kts (excerpt):
dependencies {
    testImplementation("io.kotest:kotest-runner-junit5:5.8.0")
    testImplementation("io.kotest:kotest-assertions-core:5.8.0")
}

tasks.test {
    useJUnitPlatform()
}
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Detects Kotlin + Gradle Kotlin DSL + Kotest (from
`io.kotest:kotest-runner-junit5`). Switches from JUnit 5 to Kotest, emits
`src/test/kotlin/com/acme/users/UserServiceTest.kt` using a Kotest spec
style (commonly `StringSpec` or `FunSpec`) and the Kotest matcher API
(`result shouldBe null` or equivalent). Does NOT emit a JUnit Jupiter
`@Test` annotation (Kotest specs do not use it).

**Pass condition:** Output filename ends in `UserServiceTest.kt` under
`src/test/kotlin/`. Output contains `io.kotest.core.spec.style.` (any
Kotest spec style import) AND `shouldBe` (Kotest matcher). Output does NOT
contain `@Test` from `org.junit.jupiter.api.Test` AND does NOT contain
`org.testng`, `spock.lang`, OR `org.scalatest`.

## Eval 3 - adversarial - JUnit 5 AND TestNG both declared in pom.xml → refuse, ask which to use

**Input:**

```
Author a JVM unit test for this target method.

Target class + method signature:
  com.acme.users.UserService.findById(UUID id) -> Optional<User>
  (declared in src/main/java/com/acme/users/UserService.java)
Behavior spec: "Given an empty in-memory repo, when findById is called
                with any UUID, then the returned Optional is empty."
Project root: . (contains pom.xml at the root)

pom.xml dependencies (excerpt):
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter-api</artifactId>
  <version>5.10.0</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testng</groupId>
  <artifactId>testng</artifactId>
  <version>7.9.0</version>
  <scope>test</scope>
</dependency>
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to author. Detects the conflicting framework signals
(`junit-jupiter-api` AND `testng` both in `pom.xml`). Asks the user which
framework to use. Does NOT silently pick one - JUnit 5 and TestNG both
expose `@Test` but in different packages with different `Assert`
parameter orders (JUnit: `assertEquals(expected, actual)`; TestNG:
`assertEquals(actual, expected)`), so a wrong default produces a file
whose assertion diagnostics are backwards.

**Pass condition:** Output does NOT contain a generated test method body
(no `@Test`-annotated method that calls the target `findById`). Output
contains `junit` AND `testng` AND at least one of the words
`refuse` / `conflict` / `which` / `ambiguous` / `both` (any one - signals
the refuse-to-proceed message). Output asks the user to choose one
framework before proceeding.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks on the emitted test file content
  (or, for Eval 3, on the agent's refuse-to-proceed message).
- The agent's tool surface (`Write`, `Edit`, narrow `Bash(mvn *)` /
  `Bash(gradle *)` / `Bash(sbt *)`) writes only into the project's
  `src/test/{java,kotlin,scala,groovy}/` tree; eval re-runs should not
  modify production source.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7
  sub-checks (≥3 cases, ≥1 adversarial, concrete pass conditions).
