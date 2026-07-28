# CodeQL query packs, custom queries, and CI

Reference detail for `codeql-queries`. The SKILL.md spine keeps the core
create/analyze/triage path; this file holds the full pack list, the custom
`.ql` example, and the GitHub Actions integration. Per
[docs.github.com/code-security/codeql-cli](https://docs.github.com/code-security/codeql-cli/getting-started-with-the-codeql-cli/).

## Query packs

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

Each pack ships query suites: `code-scanning` (default for GitHub Code
Scanning), `security-and-quality` (broader), `security-extended` (more
rules, more false positives).

```bash
codeql database analyze my-db \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls \
  --format=sarif-latest \
  --output=results.sarif
```

## Custom query authoring

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

Custom queries register in a query suite (`.qls`) for selective execution.
Validate them with `codeql test` against expected-results files.

## CI integration (GitHub Actions)

Most teams use the GitHub-hosted action for any GitHub-hosted repo:

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

For non-GitHub CI (GitLab / Jenkins), use the CodeQL CLI directly (create +
analyze) and upload SARIF to GitHub Code Scanning via the API or a
SARIF-compatible viewer.
