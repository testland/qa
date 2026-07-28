# jqwik reference

Full lookup tables and maintenance notes for `jqwik-testing`. Source:
[jqwik.net](https://jqwik.net/).

## Version

Pinned to jqwik `1.9.3` (latest at source-fetch); the artifact pulls in
the JUnit 5 platform dependency transitively. Check jqwik.net before bumping.

## Constraint annotations

In `net.jqwik.api.constraints.*`:

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

## Arbitraries catalog

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
- **Kotlin support requires extra setup.** Per [jqwik.net](https://jqwik.net/),
  Kotlin is supported but requires the `jqwik-kotlin` extension.
- **No native async support.** Test reactive / coroutine code
  through `runBlocking` (Kotlin) or explicit `Future.get()`.
- **JUnit 5 only.** No JUnit 4 platform integration.
