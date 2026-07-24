---
name: jazzer-jvm-fuzzing
description: "Author and run Jazzer - Code Intelligence's JVM coverage-guided fuzzer built on libFuzzer. Covers Maven / Gradle / standalone JAR installation, the @FuzzTest annotation (JUnit 5 integration), typed parameter mutation (String, primitives, byte[]), built-in JVM sanitisers (SSRF / path traversal / OS command injection / deserialization gadget / ReDoS), and the JAZZER_FUZZ=1 env var to switch between regression and fuzzing modes. Use for fuzz testing Java / Kotlin libraries - particularly effective against parsing, deserialization, and HTTP-handling code."
---

# jazzer-jvm-fuzzing

## Overview

Distinct from C/C++ fuzzers: Jazzer (per
[github.com/CodeIntelligenceTesting/jazzer](https://github.com/CodeIntelligenceTesting/jazzer))
ships **JVM-level sanitisers**
that detect security-sensitive misuse of standard APIs
(deserialization gadgets, SSRF, ReDoS) - not memory-safety bugs
(the JVM handles those).

For corpus discipline see
`corpus-management-reference`.

## When to use

- Fuzz testing Java / Kotlin / Scala / Groovy libraries.
- Targets handling user input - parsers, deserialisers, HTTP
  handlers, URL constructors (Jazzer's JVM sanitisers catch
  injection bugs).
- JUnit 5-anchored projects - Jazzer integrates as a JUnit test
  type.

## Authoring

### Install (Maven)

Per Jazzer README:

```xml
<dependency>
    <groupId>com.code-intelligence</groupId>
    <artifactId>jazzer-junit</artifactId>
    <version>0.22.1</version>
    <scope>test</scope>
</dependency>
```

(Replace `0.22.1` with current latest.)

### Install (Gradle)

```gradle
dependencies {
    testImplementation 'com.code-intelligence:jazzer-junit:0.22.1'
}
```

### Install (standalone)

Download binary release from GitHub; invoke `jazzer --cp=<classpath>`.

### Fuzz target with JUnit 5

```java
import com.code_intelligence.jazzer.junit.FuzzTest;
import org.jetbrains.annotations.NotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class ParserFuzzTest {

    @FuzzTest
    void fuzzDecode(@NotNull String input) {
        assertEquals(input, SomeScheme.decode(SomeScheme.encode(input)));
    }
}
```

Per Jazzer docs, `@FuzzTest` is the annotation that registers a
fuzz target. The method parameters become fuzzer-mutated typed
inputs.

### Supported parameter types

Per Jazzer README, `@FuzzTest` parameters support:

- Primitive types (`int`, `long`, `boolean`, `byte`, `char`,
  `short`, `float`, `double`)
- `String`
- Arrays of primitives + arrays of `String`
- Many standard library classes via auto-marshalling

Annotations refine mutation:

| Annotation | Effect |
|---|---|
| `@NotNull` | Parameter never null |
| `@WithUtf8Length(min=N, max=M)` | String byte-length bound |
| `@InRange(min=N, max=M)` | Integer range |

```java
@FuzzTest
void fuzzWithBounds(@NotNull @WithUtf8Length(max = 256) String host,
                    @InRange(min = 1, max = 65535) int port) {
    handleRequest(host, port);
}
```

### FuzzedDataProvider (advanced)

For complex input shapes:

```java
import com.code_intelligence.jazzer.api.FuzzedDataProvider;

@FuzzTest
void fuzzComplex(FuzzedDataProvider data) {
    int n = data.consumeInt(0, 100);
    String s = data.consumeString(64);
    byte[] body = data.consumeRemainingAsBytes();
    process(n, s, body);
}
```

## Running

### Modes - regression vs fuzzing

Per Jazzer docs:

- **Regression mode** (default): runs the test against any saved
  inputs in `src/test/resources/<TestClass>/<methodName>/` - 
  fast, deterministic.
- **Fuzzing mode**: set `JAZZER_FUZZ=1` env var; explores new
  inputs.

```bash
# Regression
mvn test

# Fuzzing
JAZZER_FUZZ=1 mvn test -Dtest=ParserFuzzTest#fuzzDecode

# Bounded time
JAZZER_FUZZ=300 mvn test -Dtest=ParserFuzzTest
# (specific seconds)
```

### Standalone invocation

```bash
./jazzer \
  --cp=target/test-classes:target/classes \
  --target_class=com.example.ParserFuzzTest \
  --target_method=fuzzDecode \
  -max_total_time=300
```

### Common flags

Jazzer accepts libFuzzer-style flags:

| Flag | Effect |
|---|---|
| `-max_total_time=N` | Stop after N seconds |
| `-runs=N` | Number of iterations |
| `-dict=path` | Dictionary file |
| `--keep_going=N` | Keep fuzzing after first crash (find N total) |
| `--instrumentation_includes=PKG.*` | Limit coverage instrumentation to a package |

## JVM sanitisers

Per Jazzer README, built-in detectors fire on security-relevant
misuse:

| Sanitiser | What it catches |
|---|---|
| **Deserialization** | Untrusted ObjectInputStream / XStream / Kryo input → gadget execution |
| **SSRF** | URL constructed from untrusted input pointing at internal infrastructure |
| **Path traversal** | `..` / encoded variants in file path arguments |
| **OS command injection** | `Runtime.exec` / `ProcessBuilder` with concatenated input |
| **ReDoS** | Catastrophic-backtracking regex constructed from untrusted input |
| **LDAP injection** | LDAP query string concatenation |
| **Naming context** | JNDI lookup with untrusted name |
| **SQL injection (via Hibernate / direct JDBC)** | Query string concatenation |

These run automatically - no additional configuration. Disable
selectively via `--disabled_hooks=...`.

## Parsing results

When Jazzer finds a crash, output:

```
== Java Exception: java.lang.AssertionError: expected: <foo> but was: <bar>
    at com.example.ParserFuzzTest.fuzzDecode(ParserFuzzTest.java:12)
    ...
== libFuzzer crashing input ==
artifact_prefix='./'; Test unit written to ./crash-<sha1>
Base64: <encoded-input>
Reproducer input written to: src/test/resources/com/example/ParserFuzzTest/fuzzDecode/<sha1>
```

The reproducer is saved to `src/test/resources/...` as part of
the test fixtures - commit it for regression coverage.

## CI integration

```yaml
- uses: actions/setup-java@v5
  with: { java-version: '17', distribution: 'temurin' }
- name: Run unit tests + regression fuzz inputs
  run: mvn test
- name: Smoke fuzz (3 min per target)
  run: |
    for cls in $(grep -rl "@FuzzTest" src/test/java/ | \
                 sed 's|src/test/java/||; s|/|.|g; s|.java||'); do
      JAZZER_FUZZ=180 mvn test -Dtest=$cls || true
    done
- uses: actions/upload-artifact@v4
  with:
    name: jazzer-crashes
    path: |
      crash-*
      src/test/resources/**/*
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Untyped `byte[]` parameter for structured input | Foregoes Jazzer's typed-mutation advantage | Use typed parameters or `FuzzedDataProvider` |
| Catching `Throwable` in target | Hides real bugs | Let exceptions propagate; use `assertXxx` for invariants |
| Skipping `@NotNull` annotation | Spurious NPE crashes | Always annotate `@NotNull` unless null is legitimate |
| Not committing reproducer files | Lose regression coverage | Commit `src/test/resources/<test-class>/<method>/` |
| Disabling all JVM sanitisers | Loses Jazzer's biggest advantage over plain libFuzzer | Keep sanitisers enabled; disable selectively if false positives |
| Single-target campaign | Other targets not exercised | Run all `@FuzzTest` methods in CI |

## Limitations

- **JVM startup cost.** Each fuzz iteration shares the JVM, so
  startup is amortised - but JIT warmup still affects early
  iterations.
- **Allocation-heavy targets slow.** GC dominates iteration time
  for allocation-heavy code.
- **Native (JNI) code not coverage-instrumented.** For native
  bug-hunting in JNI libraries use libFuzzer + JNI wrappers.
- **`@FuzzTest` on Kotlin works** but parameter mutation respects
  Kotlin nullability - null-tolerant Kotlin parameters fuzz with
  null values too.
- **Distinguishes "test failure" from "fuzz finding"** loosely - 
  any `AssertionError` is a finding; tune assertions deliberately.

## References

- Jazzer - 
  [github.com/CodeIntelligenceTesting/jazzer](https://github.com/CodeIntelligenceTesting/jazzer).
- Jazzer junit dependency - 
  [search.maven.org/artifact/com.code-intelligence/jazzer-junit](https://search.maven.org/artifact/com.code-intelligence/jazzer-junit).
- LLVM libFuzzer (underlying) - 
  [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html).
- Composes:
  `corpus-management-reference`.
- Sibling fuzzers:
  `libfuzzer-cpp`,
  `afl-plus-plus`,
  `cargo-fuzz-rust`,
  `go-native-fuzzing`,
  `atheris-python-fuzzing`,
  `ossfuzz-integration`.
- Dispatcher:
  `fuzz-tool-selector`.
