---
name: gosec-go
description: "Configures and runs gosec - Go-only SAST covering 40+ rule IDs (G101 hardcoded creds, G104 unhandled errors, G304 path traversal, G401 weak crypto, G601 memory aliasing) via Go AST + SSA taint tracking; `gosec ./...` scan, `#nosec G404 -- justification` suppression, `--fmt sarif|json|junit-xml|html`, golangci-lint integration. Use for a focused Go SAST wired into golangci-lint / CI. Go-only: for Python use bandit-python, for cross-language pattern SAST use semgrep-rules; to merge gosec findings with other scanners into one gate use multi-tool-finding-triage - not this for non-Go code."
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
- Layered with `semgrep-rules` for
  cross-language coverage.

## How to use

1. Install the CLI: `go install github.com/securego/gosec/v2/cmd/gosec@latest` (Step 1).
2. Run a baseline recursive scan `gosec ./...`, then narrow noise with `-severity=high -confidence=high` (Steps 2, 5).
3. Look up any flagged rule ID in [references/rule-catalog.md](references/rule-catalog.md) to interpret the finding (Step 3).
4. Triage false positives with inline `// #nosec Gxxx -- Reason: ...` and never a bare `#nosec` (Step 5).
5. Wire gosec into golangci-lint via `.golangci.yml` so config is unified (Step 6).
6. Emit SARIF in CI (`-fmt sarif -out gosec.sarif ./...`) and upload it for a PR-blocking gate (Steps 4, 7).
7. Quarterly, grep for `#nosec` lines lacking `-- Reason:` and re-review them (Step 5).

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

gosec ships 40+ rule IDs (G101 hardcoded creds, G104 unhandled
errors, G304 path traversal, G401 weak crypto, G601 memory aliasing,
and more). The full lookup table - every ID and its meaning - lives
in [references/rule-catalog.md](references/rule-catalog.md).

Full current list at runtime: `gosec -list-rules`.

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

## Worked example

A Go microservice needs to clear a security review. Run
`gosec -severity=high -confidence=high ./...`; gosec reports a G401
on a `md5.Sum(data)` call and a G104 on an unchecked `w.Write`
return.

- G401 is a false positive here - the MD5 is a vendor-mandated
  checksum, not a security hash. Suppress it with an audited
  justification (Step 5):

  ```go
  // #nosec G401 -- Reason: legacy MD5 required for vendor-mandated checksum format
  hash := md5.Sum(data)
  ```

- G104 is a real bug - the unhandled `w.Write` error is fixed by
  checking its return value, not suppressed.

Re-run `gosec -fmt sarif -out gosec.sarif ./...`; the SARIF now
reports zero HIGH findings, and the golangci-lint gate from Step 6
passes in CI.

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
  `codeql-queries` catches.
- Rule depth varies - newer Go patterns (generics, structured
  concurrency) coverage thinner.

## References

- [gs-gh][gs-gh] - repository, install, rule list, suppression syntax
- gosec subcommand `gosec -list-rules` - current rule catalog
- golangci-lint.run - golangci-lint integration
- securego/gosec GitHub Action - github.com/securego/gosec
- `semgrep-rules`,
  `sonarqube-rules`,
  `codeql-queries`,
  `bandit-python` - sister scanners
