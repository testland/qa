---
name: gosec-go
description: "Configures and runs gosec - Go-specific SAST covering 40+ rule IDs (G101 hardcoded creds, G104 unhandled errors, G304 file path traversal, G401 weak crypto algorithms, G601 implicit memory aliasing, etc.); supports `gosec ./...` recursive scan via Go AST + SSA analysis with taint tracking; per-line `#nosec G404 -- justification` suppression; output formats `--fmt sarif|json|junit-xml|html|text`; integrates with golangci-lint as a linter. Use when the user works with Go and needs a focused SAST integrated with golangci-lint."
---

# gosec-go

## Overview

Per [github.com/securego/gosec][gs-gh]:

[gs-gh]: https://github.com/securego/gosec

gosec is the Go-specific SAST. It "performs static code analysis
by scanning the Go AST and SSA code representation" and supports
"taint analysis tracking data flow from user inputs to dangerous
functions" per [gs-gh][gs-gh].

The taint analysis distinguishes gosec from regex-based linters - 
it tracks input flow through method chains, which catches injection
patterns linters miss.

## When to use

- Repo has Go source (gosec is Go-only).
- The team needs Go-focused SAST integrated with golangci-lint.
- A CI workflow needs PR-blocking security gates for Go services.
- Layered with [`semgrep-rules`](../semgrep-rules/SKILL.md) for
  cross-language coverage.

## Step 1 - Install

Per [gs-gh][gs-gh]:

```bash
go install github.com/securego/gosec/v2/cmd/gosec@latest
```

For pinned versions in CI:

```bash
go install github.com/securego/gosec/v2/cmd/gosec@v2.20.0
```

Docker:

```bash
docker pull securego/gosec
docker run --rm -v "$PWD:/code" securego/gosec ./code/...
```

## Step 2 - Basic recursive scan

Per [gs-gh][gs-gh]:

```bash
gosec ./...
```

Common variations:

```bash
gosec -severity=high ./...           # only HIGH severity
gosec -confidence=high ./...         # only HIGH confidence
gosec -exclude=G104 ./...            # skip "unhandled errors" rule
gosec -include=G101,G102 ./...       # only run specific rules
```

## Step 3 - Rule ID catalog

Per [gs-gh][gs-gh] the common rule IDs:

| Rule | Description |
|---|---|
| G101 | Hardcoded credentials |
| G102 | Bind to all interfaces (0.0.0.0) |
| G103 | Audit unsafe block (use of `unsafe` package) |
| G104 | Unhandled errors |
| G106 | SSH InsecureIgnoreHostKey |
| G107 | URL with potential SSRF |
| G201 | SQL query construction by string concat |
| G202 | SQL query construction by string format |
| G204 | Subprocess launched with variable |
| G301 | Poor file permissions on directory |
| G302 | Poor file permissions on file |
| G303 | Predictable temp-file name |
| G304 | File path traversal vulnerabilities |
| G305 | File traversal in tar archive |
| G401 | Weak cryptographic algorithms |
| G402 | TLS InsecureSkipVerify |
| G403 | RSA key length too short |
| G404 | Insecure random number generation |
| G501-G505 | Insecure crypto primitives (DES, MD5, RC4, SHA1) |
| G601 | Implicit memory aliasing in for-range |
| G602 | Slice bounds out of range |

Full list: gosec subcommand `gosec -list-rules`.

## Step 4 - Output formats

Per [gs-gh][gs-gh]:

```bash
gosec -fmt sarif -out results.sarif ./...
gosec -fmt json -out results.json ./...
gosec -fmt junit-xml -out results.xml ./...
gosec -fmt html -out results.html ./...
gosec -fmt text -out results.txt ./...
gosec -fmt yaml -out results.yaml ./...
```

For multi-scanner triage integration, use JSON.

## Step 5 - False-positive triage (MANDATORY)

Per [gs-gh][gs-gh] the canonical inline suppression syntax:

```go
// #nosec G404 -- justification text
```

Format: `#nosec [RuleList] [-- Justification]`.

Three suppression layers:

| Mechanism | Example | When to use |
|---|---|---|
| Per-line `#nosec` | `// #nosec G101 -- test fixture; not deployed to prod` | Single-line exception with justification |
| Per-rule list `#nosec` | `// #nosec G104,G115 -- intentional in this fast-path` | Multi-rule single-line |
| `-exclude=` flag | `gosec -exclude=G104 ./...` | Project-wide rule disable (CI flag) |
| `-confidence=` filter | `gosec -confidence=high ./...` | Triage workflow: only high-confidence first |

**Justification template (mandatory in code):**

```go
// #nosec G401 -- Reason: legacy MD5 required for vendor-mandated checksum format
// Reviewer: alice@example.com (2026-05-15)
// Expires: 2026-12-15
hash := md5.Sum(data)
```

Bandit-style cadence: every quarter, grep for `#nosec` patterns
lacking `-- Reason:` and flag for review.

## Step 6 - golangci-lint integration

Most Go teams run gosec via golangci-lint (the universal linter
runner) rather than directly:

```yaml
# .golangci.yml
linters:
  enable:
    - gosec

linters-settings:
  gosec:
    excludes:
      - G104                     # unhandled errors (often noise)
    severity: medium
    confidence: medium
    config:
      G306: "0644"               # default file perm threshold
```

```bash
golangci-lint run ./...
```

This is the recommended pattern - `golangci-lint` handles parallelism,
caching, and unified output across multiple linters.

## Step 7 - CI integration

Standalone:

```yaml
jobs:
  gosec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - uses: securego/gosec@master
        with:
          args: -fmt sarif -out gosec.sarif ./...
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: gosec.sarif }
```

Via golangci-lint (preferred):

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - uses: golangci/golangci-lint-action@v6
        with:
          version: latest
```

## Step 8 - Custom rules via Go templates

Unlike Semgrep / CodeQL, gosec doesn't have a custom-rule DSL - 
adding new rules requires writing Go code in `gosec/rules/` and
contributing upstream OR forking. For most teams, leverage the
40+ built-in rules + suppressions.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `#nosec` without rule ID | Suppresses ALL rules on that line | `// #nosec G401` (specific, Step 5) |
| `#nosec` without `-- Justification` | No audit trail | Required template (Step 5) |
| Skip `-confidence=` filter | LOW confidence drowns the team | `-confidence=high` for triage (Step 2) |
| Run gosec separately from golangci-lint | Two linters with different config | golangci-lint integration (Step 6) |
| Exclude G104 globally | Loses entire "unhandled errors" coverage | Per-call `// #nosec G104 -- intentional` |

## Limitations

- Go-only; for other languages see sister skills.
- Custom-rule authoring requires Go programming + upstream PR (vs
  YAML rule authoring in Semgrep).
- Some patterns (cross-package taint flow) miss what
  [`codeql-queries`](../codeql-queries/SKILL.md) catches.
- Rule depth varies - newer Go patterns (generics, structured
  concurrency) coverage thinner.

## References

- [gs-gh][gs-gh] - repository, install, rule list, suppression syntax
- gosec subcommand `gosec -list-rules` - current rule catalog
- golangci-lint.run - golangci-lint integration
- securego/gosec GitHub Action - github.com/securego/gosec
- [`semgrep-rules`](../semgrep-rules/SKILL.md),
  [`sonarqube-rules`](../sonarqube-rules/SKILL.md),
  [`codeql-queries`](../codeql-queries/SKILL.md),
  [`bandit-python`](../bandit-python/SKILL.md) - sister scanners
