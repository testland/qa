# AssertJ - matcher catalog (advanced variants)

Advanced per-feature variants that build on the core forms in the `assertj` SKILL.md. Each section links its AssertJ docs source.

## Collections and iterables

Source: https://assertj.github.io/doc/#collection-assertions

```java
assertThat(list).isEmpty();
assertThat(list).containsOnly(frodo, sam);   // any order, exact set
assertThat(list).doesNotContain(sauron);

// Extract multiple properties as tuples
assertThat(fellowship).extracting("name", "age")
                      .contains(tuple("Boromir", 37), tuple("Sam", 38));

// Filter before asserting
assertThat(fellowship).filteredOn(c -> c.getName().contains("o"))
                      .containsOnly(aragorn, frodo);

// Assert at least one element matches
assertThat(hobbits).anySatisfy(c ->
    assertThat(c.getName()).isEqualTo("Sam"));
```

## Exception assertions

Source: https://assertj.github.io/doc/#exception-assertions

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

## Recursive comparison

Source: https://assertj.github.io/doc/#recursive-comparison

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

## Custom assertions

Source: https://assertj.github.io/doc/#custom-assertions

Extend `AbstractAssert<SELF, ACTUAL>` with one method per domain rule, then expose a static factory mirroring `assertThat`:

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

public static PersonAssert assertThat(Person actual) {
    return new PersonAssert(actual);
}
```

Usage then reads like built-in assertions:

```java
assertThat(person).hasName("Alice").isAdult();
```
