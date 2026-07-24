---
name: codeql-queries
description: "Configures and runs GitHub CodeQL - semantic-database SAST with queries written in the CodeQL declarative query language; supports `codeql database create` (per-language) + `codeql database analyze` with --format=sarif; ships query packs (`codeql/javascript-queries`, `codeql/python-queries`, `codeql/java-queries`, `codeql/go-queries`, etc.); integrates with GitHub Code Scanning via SARIF upload; suppression via inline comment + sarif-filter + Security-tab dismissal. Use when the team uses GitHub-hosted repos and needs deep semantic SAST beyond pattern matching (cross-file taint flows, dataflow analysis)."
---

# codeql-queries

## Overview

Per [docs.github.com/code-security/codeql-cli][cql-docs]:

[cql-docs]: https://docs.github.com/code-security/codeql-cli/getting-started-with-the-codeql-cli/

CodeQL is GitHub's semantic-analysis SAST. The model differs from
pattern-based scanners (Semgrep / SonarQube):

1. Build a **database** representing the codebase as queryable
   facts (control flow, data flow, type info).
2. Run **queries** (`.ql` files) against the database to surface
   findings.
3. Output **SARIF** for GitHub Code Scanning integration.

This database-then-query model enables cross-file taint tracking
(e.g., "any user input that flows to a SQL query without
sanitization") that pattern matchers can't express.

## When to use

- The team uses GitHub-hosted repos (Code Scanning is GitHub-native).
- The codebase has cross-file taint flows that pattern-matchers
  miss (e.g., user input → service A → service B → SQL).
- A security audit requires CodeQL coverage (some compliance
  regimes prefer it).
- The team writes custom queries for org-specific patterns.

For multi-platform CI without GitHub, use `semgrep-rules`
or `sonarqube-rules`.

## Step 1 - Install

CodeQL CLI download from
[github.com/github/codeql-cli-binaries/releases](https://github.com/github/codeql-cli-binaries/releases).
Per [cql-docs][cql-docs] the CLI is bundled separately from the
queries - install both:

```bash
# Download CodeQL CLI (per platform)
curl -L https://github.com/github/codeql-cli-binaries/releases/latest/download/codeql-linux64.zip -o codeql.zip
unzip codeql.zip
export PATH="$PATH:$PWD/codeql"

# Verify
codeql --version
```

Query packs (the `.ql` files) are pulled per-scan via
`--download` flag or pre-installed via `codeql pack download`.

## Step 2 - Create a database

```bash
# For interpreted languages (JS, Python, Ruby): no build needed
codeql database create my-db --language=javascript --source-root=.

# For compiled languages (Java, C#, Go): wrap the build
codeql database create my-db --language=java --command="./gradlew build" --source-root=.

codeql database create my-db --language=cpp --command="make all"
```

The `--language` flag accepts: `cpp` / `csharp` / `go` / `java` /
`javascript` / `python` / `ruby` / `swift` / `kotlin` (verify
support against [cql-docs][cql-docs] for the current CodeQL release).

For JS/TS + Python, the `--build-mode none` extraction works
without a build step. For Java/C#/C++, you MUST wrap the project's
build via `--command` so CodeQL can observe compilation.

## Step 3 - Analyze with query packs

```bash
codeql database analyze my-db \
  --format=sarif-latest \
  --output=results.sarif \
  codeql/javascript-queries
```

Common query packs (per [cql-docs][cql-docs]):

| Pack | Coverage |
|---|---|
| `codeql/javascript-queries` | JS/TS standard checks |
| `codeql/python-queries` | Python checks |
| `codeql/java-queries` | Java + Kotlin checks |
| `codeql/go-queries` | Go checks |
| `codeql/cpp-queries` | C/C++ checks |
| `codeql/csharp-queries` | C# checks |
| `codeql/ruby-queries` | Ruby checks |
| `codeql/swift-queries` | Swift checks |

Each pack ships query suites: `code-scanning` (default for GitHub
Code Scanning), `security-and-quality` (broader), `security-extended`
(more rules, more false positives).

```bash
codeql database analyze my-db \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls \
  --format=sarif-latest \
  --output=results.sarif
```

## Step 4 - Custom query authoring

```ql
/**
 * @name Hardcoded JWT secret in jwt.sign call
 * @description Detects jwt.sign() calls with literal-string secret
 * @kind problem
 * @problem.severity error
 * @id js/hardcoded-jwt-secret
 * @tags security
 *       external/cwe/cwe-798
 */

import javascript

from CallExpr call, StringLiteral secret
where
  call.getCalleeName() = "sign" and
  call.getReceiver().(VarRef).getName() = "jwt" and
  call.getArgument(1) = secret
select call, "Hardcoded JWT secret detected: " + secret.getValue()
```

The CodeQL query language has a steeper learning curve than YAML
patterns (Semgrep). Worth the investment for cross-file taint flows;
overkill for simple "find this token" rules.

Custom queries register in a query suite (`.qls`) for selective
execution.

## Step 5 - False-positive triage (MANDATORY)

Three layers:

| Mechanism | Example | When to use |
|---|---|---|
| Inline `// codeql[<rule-id>]` | `// codeql[js/sql-injection] - Reason: input pre-sanitized via library X` | Single-line exception with documented rationale |
| SARIF post-processing filter | `cat results.sarif \| jq 'del(.runs[].results[] \| select(.ruleId == "js/path-injection" and .locations[].physicalLocation.artifactLocation.uri \| startswith("vendor/")))'` | Bulk exclusion of vendored / generated code |
| GitHub Security tab dismissal | UI: "Dismiss alert" → False positive / Won't fix / Used in tests | Persistent, auditable, requires reviewer comment |

**Justification template (mandatory in code):**

```javascript
// codeql[js/sql-injection]
// Reason: parameter pre-validated via Joi schema (line 42); literal interpolation safe
// Reviewer: alice@example.com (2026-05-15)
// Expires: 2026-12-15
const result = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

GitHub Security tab dismissals are persistent + auditable + show in
the audit log; prefer them over inline comments for production
suppressions.

Cadence: every quarter, review GitHub Security → "Dismissed alerts"
filter; expired ones reopened for re-review.

## Step 6 - CI integration

Most teams use the GitHub-hosted action (recommended for any
GitHub-hosted repo):

```yaml
jobs:
  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write   # for SARIF upload to Security tab
    steps:
      - uses: actions/checkout@v5
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript, python
          queries: security-extended
      - run: ./gradlew build   # or whatever build step is needed
      - uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript"
```

For non-GitHub CI (GitLab / Jenkins), use the CodeQL CLI directly
(Steps 2 - 3) and upload SARIF to GitHub Code Scanning via the API
or to a SARIF-compatible viewer.

## Step 7 - Database performance

CodeQL databases can be GBs for large codebases. Performance flags:

```bash
codeql database create my-db --language=java \
  --command="./gradlew build" \
  --threads=8 \
  --ram=8192   # MB
```

For incremental scanning (changed-files-only), GitHub's hosted
runner uses caching across runs. Self-hosted CI must implement
caching manually (the `codeql-action/init` action handles it on
GitHub).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `--command` for compiled languages | Database empty; analysis returns no findings silently | Always wrap the build (Step 2) |
| Use `security-extended` without baseline | Flood of pre-existing findings overwhelms the team | Start with `code-scanning`; ratchet up |
| Inline comment without GitHub dismissal | No audit trail | Use Security-tab dismissal for persistent FPs (Step 5) |
| Run CodeQL on every PR for large codebase | Database creation is slow (10 - 30 min); PR cycle slow | Schedule full scan nightly; PR-only delta scanning via Code Scanning |
| Custom queries without test suite | Bugs in custom queries miss real findings | Use `codeql test` to validate against expected-results files |

## Limitations

- Database creation is slow for large codebases (10 - 30 min on
  monorepos); incremental scanning helps but requires caching.
- Custom-query learning curve is steep (CodeQL is a declarative
  logic language; CodeQL University courses recommended).
- Some languages have less depth than others (Go, Ruby, Swift are
  newer than JS/Java/C++).
- Self-hosted (non-GitHub) integration requires manual SARIF
  routing.
- License: CodeQL CLI is free for open-source repos; commercial
  use requires GitHub Advanced Security license.

## References

- [cql-docs][cql-docs] - CodeQL CLI getting started
- codeql.github.com/docs - official documentation root
- codeql.github.com/codeql-standard-libraries/ - per-language stdlibs
- github.com/github/codeql - query packs source
- learningqltest.github.io/learningql/ - CodeQL University training
- `semgrep-rules`,
  `sonarqube-rules`,
  `bandit-python`,
  `gosec-go` - sister scanners
