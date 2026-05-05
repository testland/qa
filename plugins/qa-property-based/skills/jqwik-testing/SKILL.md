---
name: jqwik-testing
description: Authors property-based tests for the JVM (Java + Kotlin) using jqwik — wires `@Property` test methods, `@ForAll` parameter annotations, `Arbitraries.integers/strings/etc` generators, custom `@Provide` arbitraries, and the JUnit 5 platform integration. Use when a JVM project needs PBT — alternative to JUnit-QuickCheck and Vavr's property-checking; tightly integrates with JUnit 5 so property tests run alongside conventional unit tests in the same Maven / Gradle pipeline.
rating: 23
d6: 4
archetype: S1
---

# jqwik-testing

## Overview

Per [jqwik-home][jh]:

[jh]: https://jqwik.net/

> "**jqwik** is a JVM library enabling property-based testing
> (PBT) in Java and Kotlin. ... [It] combines intuitive microtests
> with randomized test data generation."

Properties describe "a _generic invariant or post condition_ of
your code, given some _precondition_" ([jqwik-home][jh]). The
library "integrates with JUnit 5, allowing property tests to run
alongside conventional unit tests" ([jqwik-home][jh]).

## When to use

- A JVM project (Java / Kotlin / Scala) tests via JUnit 5 and
  needs PBT alongside the existing unit tests.
- The team finds JUnit-QuickCheck or Vavr's PBT awkward; jqwik's
  JUnit 5 integration is more idiomatic.
- Properties hold for parsers / encoders / round-trip transforms.

## Step 1 — Install

Maven:

```xml
<dependency>
  <groupId>net.jqwik</groupId>
  <artifactId>jqwik</artifactId>
  <version>1.9.3</version>
  <scope>test</scope>
</dependency>
```

Per [jqwik-home][jh], 1.9.3 is the latest as of the source-fetch.
The artifact pulls in the JUnit 5 platform dependency
transitively.

Gradle:

```gradle
testImplementation 'net.jqwik:jqwik:1.9.3'

test {
    useJUnitPlatform()
}
```

## Step 2 — Basic property

Per [jqwik-home][jh]:

```java
import net.jqwik.api.*;

class CartProperties {

    @Property
    boolean addingItemIncreasesCount(@ForAll int qty) {
        Cart cart = new Cart();
        cart.addItem(new Item("BOOK-001", qty));
        return cart.itemCount() == qty;
    }
}
```

The `@Property` annotation marks a property test (JUnit 5 hooks in
via the platform). `@ForAll` on a parameter means "jqwik generates
values for this." The method returns `boolean` (or `void` with
assertions).

By default jqwik runs each property with **1000 generated cases**
(more than Hypothesis's 100 or proptest's 256).

## Step 3 — Constrained generators

```java
@Property
boolean validQtyStaysInRange(@ForAll @IntRange(min = 1, max = 100) int qty) {
    Cart cart = new Cart();
    cart.addItem(new Item("BOOK-001", qty));
    return cart.itemCount() >= 1 && cart.itemCount() <= 100;
}
```

Constraint annotations (in `net.jqwik.api.constraints.*`):

| Annotation             | Purpose                                              |
|------------------------|------------------------------------------------------|
| `@IntRange(min, max)`   | Integers in range                                    |
| `@LongRange(min, max)`  | Longs in range                                       |
| `@DoubleRange(min, max)`| Doubles in range                                     |
| `@StringLength(min, max)` | Strings of bounded length                          |
| `@AlphaChars` / `@NumericChars` | String character class                       |
| `@Size(min, max)`        | Collection size                                       |
| `@NotEmpty`              | Non-empty collection / string                        |
| `@NotBlank`              | Non-whitespace string                                |
| `@Email`                 | Email-shaped string                                   |
| `@MinList` / `@MaxList`  | List bounds                                           |
| `@UniqueElements`         | Unique-element collections                            |
| `@Positive` / `@Negative` | Positive / negative number                          |

## Step 4 — Custom arbitraries via `@Provide`

```java
class UserProperties {

    @Property
    boolean userJsonRoundTrip(@ForAll("validUser") User u) {
        String json = mapper.writeValueAsString(u);
        User back = mapper.readValue(json, User.class);
        return u.equals(back);
    }

    @Provide
    Arbitrary<User> validUser() {
        Arbitrary<Long> id = Arbitraries.longs().between(1, 1_000_000);
        Arbitrary<String> email = Arbitraries.strings()
            .alpha().ofMinLength(3).ofMaxLength(10)
            .map(s -> s + "@example.com");
        Arbitrary<Integer> age = Arbitraries.integers().between(18, 100);
        return Combinators.combine(id, email, age).as(User::new);
    }
}
```

The `@Provide` method returns an `Arbitrary<T>`; its name (or
the method name when omitted) is referenced from `@ForAll("...")`.

`Combinators.combine(...)` is the canonical way to assemble a
multi-field arbitrary; `.as(...)` constructs the target object
from the parts.

## Step 5 — Arbitraries catalog

Per [jqwik-home][jh], the `Arbitraries` API provides "Built-in
generators like `Arbitraries.integers()` for creating constrained
data sets":

```java
Arbitraries.integers()                       // any int
    .between(0, 100)                         // bounded
    .greaterOrEqual(0);                       // half-bounded

Arbitraries.strings()                        // any string
    .alpha()                                  // alphabetic only
    .ofLength(8);                             // fixed length

Arbitraries.of(Status.ACTIVE, Status.SUSPENDED, Status.NOT_VERIFIED);   // enum-like

Arbitraries.subsetOf(allRoles);              // subset of a known set
```

For collections:

```java
Arbitraries.integers().list()                // List<Integer>
    .ofMinSize(1).ofMaxSize(100);

Arbitraries.strings().set();                  // Set<String>

Arbitraries.maps(
    Arbitraries.strings().alpha(),
    Arbitraries.integers().between(0, 100)
);
```

## Step 6 — Statistics + classification

```java
@Property
@Statistics
boolean evenAndOddDistribution(@ForAll int n) {
    Statistics.label("evenness").collect(n % 2 == 0 ? "even" : "odd");
    return true;
}
```

Statistics output reports the distribution of generated cases —
useful for verifying the strategy generates the intended mix.

## Step 7 — Configuration

```java
@Property(tries = 5000, shrinking = ShrinkingMode.FULL, edgeCases = EdgeCasesMode.MIXIN)
boolean expensiveProperty(@ForAll long n) {
    // ...
}
```

| Field            | Default | Use                                                |
|------------------|--------:|----------------------------------------------------|
| `tries`          |   1000  | More for higher confidence.                        |
| `shrinking`      |   FULL  | `FULL` (default) / `BOUNDED` / `OFF`.              |
| `edgeCases`      |  MIXIN  | Mix in edge cases (0, MAX, MIN, ε, etc.) by default. |
| `seed`           |  random | Fixed seed for CI determinism.                     |
| `maxDiscardRatio`|   5     | Cap on `assume()` rejection ratio.                 |

For CI determinism:

```java
@Property(seed = "42")
boolean reproducibleProperty(@ForAll int n) { /* ... */ }
```

Or globally via `jqwik.config.properties`:

```properties
defaultSeed = 42
defaultTries = 1000
```

## Step 8 — CI integration

```bash
mvn test                  # runs JUnit 5 tests including @Property
gradle test               # same
```

No additional config beyond JUnit 5 platform.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Returning `void` without assertions                                   | Test always passes; property is silent.                                  | Return `boolean` OR throw on failure (e.g. JUnit `assertTrue`). |
| `@Provide` arbitrary that filters most cases                           | Discard ratio exceeded; jqwik fails the property.                        | Constrain at the Arbitrary level (Step 3 annotations + `.between(...)`). |
| Sharing mutable state across @Property iterations                      | Test depends on iteration order; flaky.                                  | Construct fresh state per call (within the property method body). |
| Hard-coded seed in production property                                  | Loses randomization; misses regressions.                                 | Random seed locally; fixed seed in CI only (Step 7). |
| `tries = 100_000` on a slow property                                    | CI never finishes.                                                        | Budget per `total runtime / tries`. |
| Asserting on specific values inside the property                        | Defeats PBT.                                                              | Properties assert relationships. |
| Skipping `@Provide` for one-off domain objects                          | Inline construction is verbose; harder to reuse.                          | Move to `@Provide` even for one-property arbitraries. |

## Limitations

- **JVM startup cost.** Each property test pays JVM start; 1000
  iterations of fast tests are still seconds, not milliseconds.
- **Shrinking complex types is slow.** `BOUNDED` shrinking caps
  iterations; `OFF` skips entirely.
- **Kotlin support requires extra setup.** Per [jqwik-home][jh],
  Kotlin is supported but requires the `jqwik-kotlin` extension.
- **No native async support.** Test reactive / coroutine code
  through `runBlocking` (Kotlin) or explicit `Future.get()`.
- **JUnit 5 only.** No JUnit 4 platform integration.

## References

- [jh][jh] — jqwik overview: `@Property`, `@ForAll`, `@Provide`,
  Arbitraries API, JUnit 5 integration, version 1.9.3.
- [`hypothesis-testing`](../hypothesis-testing/SKILL.md),
  [`fast-check-testing`](../fast-check-testing/SKILL.md),
  [`proptest-testing`](../proptest-testing/SKILL.md),
  [`quickcheck-testing`](../quickcheck-testing/SKILL.md) —
  per-language siblings.
