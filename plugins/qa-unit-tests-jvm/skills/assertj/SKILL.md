---
name: assertj
description: "Reference for AssertJ - the canonical JVM fluent-assertion library pairable with JUnit 5 / TestNG / Spock; covers the assertThat() entry point, collection matchers (contains, containsExactly, allSatisfy, extracting), exception assertions (assertThatThrownBy, catchThrowable), SoftAssertions for multi-failure collection, recursive comparison (usingRecursiveComparison) for deep equality, and domain-specific custom assertions via AbstractAssert. Use when writing JVM tests that need richer failure messages than built-in assertEquals, or when verifying complex object graphs, exception types, or collections."
---

# assertj

## Overview

AssertJ is "a Java library that provides a rich set of assertions and truly helpful error messages, improves test code readability, and is designed to be super easy to use within your favorite IDE" ([assertj.github.io/doc][aj]). It ships modules for JDK core types, Guava, Joda-Time, and databases; this skill covers **assertj-core** (JDK types).

Works alongside `junit5-tests`, `testng-tests`, or `spock-tests`. AssertJ handles the assertion layer; those skills handle the test runner.

This skill is a **reference** - defines the matcher catalog and patterns; does not run tests. Advanced per-feature variants live in [references/matcher-catalog.md](references/matcher-catalog.md); provenance links are consolidated under [References](#references).

## When to use

- JVM project (Java 8+ or Kotlin 1.9+) using any test framework.
- Need richer assertion failure messages than built-in `assertEquals` / `assertTrue`.
- Deep-equality checking between object graphs without overriding `equals`.
- Verifying collections, exception details, or running multiple assertions without failing on the first one.

## Step 1 - Install

**Maven:**

```xml
<dependency>
  <groupId>org.assertj</groupId>
  <artifactId>assertj-core</artifactId>
  <version>3.27.7</version>
  <scope>test</scope>
</dependency>
```

**Gradle:**

```gradle
testImplementation("org.assertj:assertj-core:3.27.7")
```

The `3.27.7` version is current at time of writing; check Maven Central for the latest `assertj-core` release before copying.

Static import the entry class once per test file:

```java
import static org.assertj.core.api.Assertions.*;
```

## Step 2 - assertThat entry point

`assertThat(actual)` returns a type-specific assertion object. All assertions chain fluently from it.

```java
assertThat(frodo.getName()).isEqualTo("Frodo");

assertThat("text").isNotNull()
                  .startsWith("te")
                  .contains("ex");
```

Common predicates available on every assertion:

```java
assertThat(value).isEqualTo(expected);
assertThat(value).isNotEqualTo(other);
assertThat(value).isNull();
assertThat(value).isNotNull();
assertThat(value).isSameAs(ref);            // reference equality
assertThat(value).isInstanceOf(MyClass.class);
assertThat(flag).isTrue();
assertThat(flag).isFalse();
```

Use `.as("description")` to label an assertion in failure output:

```java
assertThat(user.getAge()).as("user age").isGreaterThan(0);
```

## Step 3 - Collection assertions

```java
assertThat(list).hasSize(9);
assertThat(list).contains(frodo, sam);                // any order, subset
assertThat(list).containsExactly(frodo, sam, pippin); // exact order, exact set
```

**Element-level verification:**

```java
assertThat(hobbits).allSatisfy(c -> {
    assertThat(c.getRace()).isEqualTo(HOBBIT);
    assertThat(c.getName()).isNotEqualTo("Sauron");
});
```

**Extraction:**

```java
// Extract a property then assert on extracted values
assertThat(fellowship).extracting("name")
                      .contains("Boromir", "Gandalf", "Frodo");
```

`containsOnly` / `doesNotContain` / `isEmpty`, multi-property tuple extraction, `filteredOn`, and `anySatisfy` are in [references/matcher-catalog.md](references/matcher-catalog.md).

## Step 4 - Exception assertions

**Primary form - assertThatThrownBy:**

```java
assertThatThrownBy(() -> parser.parse(null))
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("null input");
```

Type-first (`assertThatExceptionOfType`), BDD capture (`catchThrowable` / `catchThrowableOfType`), cause-chain inspection, and no-exception (`assertThatCode`) forms are in [references/matcher-catalog.md](references/matcher-catalog.md).

## Step 5 - SoftAssertions

SoftAssertions collect failures instead of stopping at the first one. All violations are reported together in a single error.

**Instance form:**

```java
SoftAssertions softly = new SoftAssertions();
softly.assertThat(actual.getName()).isEqualTo("Frodo");
softly.assertThat(actual.getAge()).isEqualTo(33);
softly.assertThat(actual.getRace()).isEqualTo(HOBBIT);
softly.assertAll(); // throws one error listing all failures
```

**Static helper - assertSoftly:** manages lifecycle automatically; `assertAll()` is called on exit:

```java
assertSoftly(softly -> {
    softly.assertThat(frodo.getName()).isEqualTo("Frodo");
    softly.assertThat(frodo.getAge()).isEqualTo(33);
    softly.assertThat(frodo.getRace()).isEqualTo(HOBBIT);
});
```

Use SoftAssertions when a test covers multiple independent properties of the same subject, so a single run reveals all mismatches rather than stopping at the first.

## Step 6 - Recursive comparison

`usingRecursiveComparison()` compares object graphs field-by-field without requiring `equals` overrides.

```java
assertThat(sherlock).usingRecursiveComparison()
                    .isEqualTo(sherlockClone);
```

**Exclude fields:**

```java
assertThat(actual).usingRecursiveComparison()
                  .ignoringFields("id", "home.address.street")
                  .isEqualTo(expected);
```

Regex field exclusion, `ignoringActualNullFields`, per-type comparators, and `withStrictTypeChecking` are in [references/matcher-catalog.md](references/matcher-catalog.md).

## Step 7 - Custom assertions

Extend `AbstractAssert` with type parameters `<SELF, ACTUAL>` (`SELF` is the concrete assertion class, for chaining), then expose a static factory mirroring `assertThat`:

```java
public class PersonAssert extends AbstractAssert<PersonAssert, Person> {
    public PersonAssert(Person actual) { super(actual, PersonAssert.class); }

    public PersonAssert hasName(String name) {
        isNotNull();
        if (!actual.getName().equals(name)) {
            failWithMessage("Expected name <%s> but was <%s>", name, actual.getName());
        }
        return this;
    }
}

public static PersonAssert assertThat(Person actual) {
    return new PersonAssert(actual);
}
```

Usage then reads like built-in assertions: `assertThat(person).hasName("Alice")`. A multi-method example is in [references/matcher-catalog.md](references/matcher-catalog.md).

## Example - full test method

```java
@Test
void order_ships_to_correct_address() {
    Order order = orderService.place(items, address);

    assertThat(order).isNotNull();
    assertThat(order.getItems()).hasSize(2)
                                .extracting("sku")
                                .containsExactly("ITEM-001", "ITEM-002");
    assertThat(order).usingRecursiveComparison()
                     .ignoringFields("id", "createdAt")
                     .isEqualTo(expectedOrder);
}

@Test
void invalid_quantity_throws() {
    assertThatThrownBy(() -> orderService.place(emptyItems, address))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("at least one item");
}

@Test
void order_summary_fields_all_valid() {
    OrderSummary summary = orderService.summarize(orderId);

    assertSoftly(softly -> {
        softly.assertThat(summary.getTotal()).isGreaterThan(BigDecimal.ZERO);
        softly.assertThat(summary.getItemCount()).isEqualTo(2);
        softly.assertThat(summary.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
    });
}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix `assertEquals` and `assertThat` styles in same suite | Reader confusion; inconsistent failure messages | Pick one style and lint-enforce it |
| `usingRecursiveComparison` without `ignoringFields` for volatile fields | Brittle: timestamps and generated IDs differ on every run | Exclude with `ignoringFieldsMatchingRegexes(".*At", ".*Id")` |
| Skip `assertAll()` when using `SoftAssertions` instance | Failures are silently swallowed | Use `assertSoftly()` helper or always call `assertAll()` in a try-finally |
| `assertThat(flag).isEqualTo(true)` instead of `isTrue()` | Loses semantic clarity in failure messages | Use `isTrue()` / `isFalse()` |
| Skip message check on exception assertions | Test passes for any exception of that type | Always add `.hasMessageContaining(...)` |

## Limitations

- assertj-core targets Java 8+; Kotlin works but the API is more ergonomic in Java (Kotlin users may prefer AssertK).
- `usingRecursiveComparison` on cyclic object graphs requires `.withCyclicSafeComparison()`; defaults to `withIgnoreAllOverriddenEquals()` which skips `equals` overrides.
- `SoftAssertions` does not propagate assertion context automatically to nested lambdas; each lambda needs its own `softly.assertThat(...)` call.
- The `extracting` overload using string property names uses reflection; use the `Function`-based overload for compile-time safety.

## References

- [AssertJ docs][aj] - landing (install, overview)
- [Basic assertions](https://assertj.github.io/doc/#basic-assertions) - isEqualTo, isNull, isTrue, chaining
- [Collection assertions](https://assertj.github.io/doc/#collection-assertions) - iterable matchers, extracting, filtering
- [Exception assertions](https://assertj.github.io/doc/#exception-assertions) - assertThatThrownBy, catchThrowable
- [Soft assertions](https://assertj.github.io/doc/#soft-assertions) - SoftAssertions, assertSoftly
- [Recursive comparison](https://assertj.github.io/doc/#recursive-comparison) - usingRecursiveComparison variants
- [Custom assertions](https://assertj.github.io/doc/#custom-assertions) - AbstractAssert
- [references/matcher-catalog.md](references/matcher-catalog.md) - advanced per-feature variants
- github.com/assertj/assertj - repository and issue tracker
- github.com/assertj/assertj-examples - worked examples including soft assertions
- `junit5-tests`, `testng-tests`, `spock-tests` - sister skills (test runners)

[aj]: https://assertj.github.io/doc/
