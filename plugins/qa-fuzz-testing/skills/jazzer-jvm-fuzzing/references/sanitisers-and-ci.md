# Jazzer: JVM sanitisers and CI

Deep reference for `jazzer-jvm-fuzzing`. The core install / authoring /
running workflow lives in the skill spine; this file holds the full
JVM-sanitiser catalogue and the CI job.

## JVM sanitisers

Per Jazzer README, built-in detectors fire on security-relevant misuse:

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

`|| true` is continue-on-crash: a finding does not fail the job, so the
loop still fuzzes every target - triage findings from the uploaded
`jazzer-crashes` artifact. To hard-fail the build on new findings
instead, drop `|| true` (the first crash then fails the step).
