---
name: assertj
description: "Reference for AssertJ - the canonical JVM fluent-assertion library pairable with JUnit 5 / TestNG / Spock; covers the assertThat() entry point, collection matchers (contains, containsExactly, allSatisfy, extracting), exception assertions (assertThatThrownBy, catchThrowable), SoftAssertions for multi-failure collection, recursive comparison (usingRecursiveComparison) for deep equality, and domain-specific custom assertions via AbstractAssert. Use when writing JVM tests that need richer failure messages than built-in assertEquals, or when verifying complex object graphs, exception types, or collections."
rating: 23
d6: 4
---

# assertj

## Overview

Per [assertj.github.io/doc][aj]:

[aj]: https://assertj.github.io/doc/

AssertJ is "a Java library that provides a rich set of assertions and truly helpful error messages, improves test code readability, and is designed to be super easy to use within your favorite IDE." It ships modules for JDK core types, Guava, Joda-Time, and databases; this skill covers **assertj-core** (JDK types).

Works alongside [`junit5-tests`](../junit5-tests/SKILL.md), [`testng-tests`](../testng-tests/SKILL.md), or [`spock-tests`](../spock-tests/SKILL.md). AssertJ handles the assertion layer; those skills handle the test runner.

This skill is a **reference** - defines the matcher catalog and patterns; does not run tests.

## When to use

- JVM project (Java 8+ or Kotlin 1.9+) using any test framework.
- Need richer assertion failure messages than built-in `assertEquals` / `assertTrue`.
- Deep-equality checking between object graphs without overriding `equals`.
- Verifying collections, exception details, or running multiple assertions without failing on the first one.

## Step 1 - Install

Per [assertj.github.io/doc][aj]:

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

Static import the entry class once per test file:

```java
import static org.assertj.core.api.Assertions.*;
```

## Step 2 - assertThat entry point

Per [assertj.github.io/doc/#basic-assertions][aj-basic]:

[aj-basic]: https://assertj.github.io/doc/#basic-assertions

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

Per [assertj.github.io/doc/#collection-assertions][aj-col]:

[aj-col]: https://assertj.github.io/doc/#collection-assertions

```java
assertThat(list).hasSize(9);
assertThat(list).isEmpty();
assertThat(list).contains(frodo, sam);               // any order, subset
assertThat(list).containsExactly(frodo, sam, pippin); // exact order, exact set
assertThat(list).containsOnly(frodo, sam);            // any order, exact set
assertThat(list).doesNotContain(sauron);
```

**Element-level verification:**

```java
assertThat(hobbits).allSatisfy(c -> {
    assertThat(c.getRace()).isEqualTo(HOBBIT);
    assertThat(c.getName()).isNotEqualTo("Sauron");
});

assertThat(hobbits).anySatisfy(c ->
    assertThat(c.getName()).isEqualTo("Sam"));
```

**Extraction and filtering:**

```java
// Extract a property then assert on extracted values
assertThat(fellowship).extracting("name")
                      .contains("Boromir", "Gandalf", "Frodo");

// Extract multiple properties as tuples
assertThat(fellowship).extracting("name", "age")
                      .contains(tuple("Boromir", 37), tuple("Sam", 38));

// Filter before asserting
assertThat(fellowship).filteredOn(c -> c.getName().contains("o"))
                      .containsOnly(aragorn, frodo);
```

## Step 4 - Exception assertions

Per [assertj.github.io/doc/#exception-assertions][aj-ex]:

[aj-ex]: https://assertj.github.io/doc/#exception-assertions

**Primary form - assertThatThrownBy:**

```java
assertThatThrownBy(() -> parser.parse(null))
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("null input");
```

**Type-first form - assertThatExceptionOfType:**

```java
assertThatExceptionOfType(IOException.class)
    .isThrownBy(() -> { throw new IOException("boom!"); })
    .withMessage("%s!", "boom")
    .withNoCause();
```

**BDD form - catchThrowable:** separates the WHEN step from THEN:

```java
// WHEN
Throwable thrown = catchThrowable(() -> names[9]);
// THEN
assertThat(thrown).isInstanceOf(ArrayIndexOutOfBoundsException.class)
                  .hasMessageContaining("9");
```

**Typed capture - catchThrowableOfType:** returns the concrete exception for further assertion:

```java
TextException ex = catchThrowableOfType(TextException.class,
    () -> { throw new TextException("boom!", 1, 5); });
assertThat(ex.line).isEqualTo(1);
```

**Cause chain inspection:**

```java
assertThat(thrown).hasCauseInstanceOf(NullPointerException.class);
assertThat(thrown).hasRootCauseInstanceOf(SocketException.class);
assertThat(thrown).cause().hasMessage("underlying cause");
```

**Assert no exception:**

```java
assertThatCode(() -> service.process(input)).doesNotThrowAnyException();
```

## Step 5 - SoftAssertions

Per [assertj.github.io/doc/#soft-assertions][aj-soft]:

[aj-soft]: https://assertj.github.io/doc/#soft-assertions

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

Per [assertj.github.io/doc/#recursive-comparison][aj-rec]:

[aj-rec]: https://assertj.github.io/doc/#recursive-comparison

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

**Exclude by regex pattern:**

```java
assertThat(actual).usingRecursiveComparison()
                  .ignoringFieldsMatchingRegexes(".*At", ".*Id")
                  .isEqualTo(expected);
```

**Ignore nulls in actual:**

```java
assertThat(partial).usingRecursiveComparison()
                   .ignoringActualNullFields()
                   .isEqualTo(expected);
```

**Custom comparator per type:**

```java
BiPredicate<Double, Double> closeEnough = (d1, d2) -> Math.abs(d1 - d2) <= 0.5;
assertThat(frodo).usingRecursiveComparison()
                 .withEqualsForType(closeEnough, Double.class)
                 .isEqualTo(tallerFrodo);
```

**Strict type checking:**

```java
assertThat(actual).usingRecursiveComparison()
                  .withStrictTypeChecking()
                  .isEqualTo(expected);
```

## Step 7 - Custom assertions

Per [assertj.github.io/doc/#custom-assertions][aj-custom]:

[aj-custom]: https://assertj.github.io/doc/#custom-assertions

Extend `AbstractAssert` to create domain-specific assertion classes. The type parameters are `<SELF, ACTUAL>` where `SELF` is the concrete assertion class (for chaining):

```java
public class PersonAssert extends AbstractAssert<PersonAssert, Person> {

    public PersonAssert(Person actual) {
        super(actual, PersonAssert.class);
    }

    public PersonAssert hasName(String name) {
        isNotNull();
        if (!actual.getName().equals(name)) {
            failWithMessage("Expected name <%s> but was <%s>",
                            name, actual.getName());
        }
        return this;
    }

    public PersonAssert isAdult() {
        if (actual.getAge() < 18) {
            failWithMessage("Expected person to be an adult");
        }
        return this;
    }
}
```

Expose it via a static factory that mirrors `assertThat`:

```java
public static PersonAssert assertThat(Person actual) {
    return new PersonAssert(actual);
}
```

Usage then reads like built-in assertions:

```java
assertThat(person).hasName("Alice").isAdult();
```

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

- [aj][aj] - AssertJ landing (install, overview)
- [aj-basic][aj-basic] - Basic assertions (isEqualTo, isNull, isTrue, chaining)
- [aj-col][aj-col] - Collection/iterable assertions
- [aj-ex][aj-ex] - Exception assertions
- [aj-soft][aj-soft] - SoftAssertions
- [aj-rec][aj-rec] - Recursive comparison
- [aj-custom][aj-custom] - Custom assertions
- github.com/assertj/assertj - repository and issue tracker
- github.com/assertj/assertj-examples - worked examples including soft assertions
- [`junit5-tests`](../junit5-tests/SKILL.md), [`testng-tests`](../testng-tests/SKILL.md), [`spock-tests`](../spock-tests/SKILL.md) - sister skills (test runners)
