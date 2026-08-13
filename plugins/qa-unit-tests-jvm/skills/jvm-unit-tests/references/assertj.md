# AssertJ - fluent JVM assertions (reference)

Companion reference for `jvm-unit-tests`. AssertJ is "a Java library that
provides a rich set of assertions and truly helpful error messages,
improves test code readability, and is designed to be super easy to use
within your favorite IDE" ([assertj.github.io/doc][aj]). It pairs with
JUnit 5, TestNG, or Spock - AssertJ handles the assertion layer; the
framework handles the runner. This covers **assertj-core** (JDK types).

[aj]: https://assertj.github.io/doc/

Use when tests need richer failure messages than built-in `assertEquals` /
`assertTrue`, deep equality without `equals` overrides, or multi-failure
collection. Bonus: `assertThat(actual).isEqualTo(expected)` sidesteps the
JUnit-vs-TestNG argument-order trap entirely.

## Install

Maven: `org.assertj:assertj-core:3.27.7` (test scope). Gradle:
`testImplementation("org.assertj:assertj-core:3.27.7")`. Check Maven
Central for the latest release before copying. Then static-import once per
test file:

```java
import static org.assertj.core.api.Assertions.*;
```

## assertThat entry point

`assertThat(actual)` returns a type-specific assertion object; everything
chains fluently ([basic assertions](https://assertj.github.io/doc/#basic-assertions)):

```java
assertThat(frodo.getName()).isEqualTo("Frodo");

assertThat("text").isNotNull()
                  .startsWith("te")
                  .contains("ex");

assertThat(value).isSameAs(ref);            // reference equality
assertThat(value).isInstanceOf(MyClass.class);
assertThat(flag).isTrue();
assertThat(user.getAge()).as("user age").isGreaterThan(0);  // labeled
```

## Collection assertions

Per [collection assertions](https://assertj.github.io/doc/#collection-assertions):

```java
assertThat(list).hasSize(9);
assertThat(list).contains(frodo, sam);                // any order, subset
assertThat(list).containsExactly(frodo, sam, pippin); // exact order + set
assertThat(list).containsOnly(frodo, sam);            // any order, exact set
assertThat(list).doesNotContain(sauron);

// Element-level verification
assertThat(hobbits).allSatisfy(c -> {
    assertThat(c.getRace()).isEqualTo(HOBBIT);
});
assertThat(hobbits).anySatisfy(c ->
    assertThat(c.getName()).isEqualTo("Sam"));

// Extraction - single property, or tuples for several
assertThat(fellowship).extracting("name")
                      .contains("Boromir", "Gandalf", "Frodo");
assertThat(fellowship).extracting("name", "age")
                      .contains(tuple("Boromir", 37), tuple("Sam", 38));

// Filter before asserting
assertThat(fellowship).filteredOn(c -> c.getName().contains("o"))
                      .containsOnly(aragorn, frodo);
```

## Exception assertions

Per [exception assertions](https://assertj.github.io/doc/#exception-assertions):

```java
// Primary form
assertThatThrownBy(() -> parser.parse(null))
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("null input");

// Type-first form
assertThatExceptionOfType(IOException.class)
    .isThrownBy(() -> { throw new IOException("boom!"); })
    .withMessage("%s!", "boom")
    .withNoCause();

// BDD form - separates WHEN from THEN
Throwable thrown = catchThrowable(() -> names[9]);
assertThat(thrown).isInstanceOf(ArrayIndexOutOfBoundsException.class)
                  .hasMessageContaining("9");

// Cause-chain inspection
assertThat(thrown).hasCauseInstanceOf(NullPointerException.class);
assertThat(thrown).hasRootCauseInstanceOf(SocketException.class);

// Assert no exception
assertThatCode(() -> service.process(input)).doesNotThrowAnyException();
```

Always add a message check - a type-only assertion passes for any
exception of that type.

## SoftAssertions

Per [soft assertions](https://assertj.github.io/doc/#soft-assertions) -
collect failures instead of stopping at the first; all violations report
together. Prefer the static helper (calls `assertAll()` on exit):

```java
assertSoftly(softly -> {
    softly.assertThat(frodo.getName()).isEqualTo("Frodo");
    softly.assertThat(frodo.getAge()).isEqualTo(33);
    softly.assertThat(frodo.getRace()).isEqualTo(HOBBIT);
});
```

With the instance form (`new SoftAssertions()`), a skipped `assertAll()`
silently swallows failures.

## Recursive comparison

Per [recursive comparison](https://assertj.github.io/doc/#recursive-comparison) -
field-by-field object-graph equality without `equals` overrides:

```java
assertThat(sherlock).usingRecursiveComparison()
                    .isEqualTo(sherlockClone);

// Exclude volatile fields
assertThat(actual).usingRecursiveComparison()
                  .ignoringFields("id", "home.address.street")
                  .ignoringFieldsMatchingRegexes(".*At", ".*Id")
                  .isEqualTo(expected);

// Other variants
.ignoringActualNullFields()
.withEqualsForType((d1, d2) -> Math.abs(d1 - d2) <= 0.5, Double.class)
.withStrictTypeChecking()
```

## Custom assertions

Per [custom assertions](https://assertj.github.io/doc/#custom-assertions) -
extend `AbstractAssert<SELF, ACTUAL>` and expose a static factory:

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

Usage reads like built-ins: `assertThat(person).hasName("Alice")`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix `assertEquals` and `assertThat` styles in one suite | Inconsistent failure messages | Pick one style, lint-enforce |
| Recursive comparison without excluding volatile fields | Timestamps/IDs differ per run | `ignoringFieldsMatchingRegexes(".*At", ".*Id")` |
| `SoftAssertions` instance without `assertAll()` | Failures silently swallowed | `assertSoftly()` helper |
| `assertThat(flag).isEqualTo(true)` | Loses semantic failure message | `isTrue()` / `isFalse()` |
| Exception assertion without message check | Passes for any exception of the type | `.hasMessageContaining(...)` |

## Limitations

- Targets Java 8+; Kotlin works but Kotlin users may prefer AssertK.
- Cyclic object graphs in recursive comparison need care; it defaults to
  ignoring overridden `equals`.
- String-name `extracting` uses reflection; prefer the `Function` overload
  for compile-time safety.

## References

- [aj][aj] - AssertJ docs (install, all sections linked above)
- github.com/assertj/assertj - repository
- github.com/assertj/assertj-examples - worked examples
