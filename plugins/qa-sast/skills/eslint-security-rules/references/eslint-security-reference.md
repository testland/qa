# eslint security rule catalog and CI workflow

Full rule catalog and the complete GitHub Actions workflow for
`eslint-security-rules`. The SKILL.md spine keeps setup, triage, and the
SARIF/JSON commands; this file holds the exhaustive tables and workflow.

[esp-sec]: https://github.com/eslint-community/eslint-plugin-security
[esp-xss]: https://github.com/mozilla/eslint-plugin-no-unsanitized

## eslint-plugin-security rules

Per [esp-sec][esp-sec], `configs.recommended` enables all 14 `detect-*` rules:

| Rule ID | Detects |
|---|---|
| `security/detect-bidi-characters` | Unicode bidi override characters (trojan-source attacks) |
| `security/detect-buffer-noassert` | `Buffer` calls with the `noAssert` flag set |
| `security/detect-child-process` | `child_process` use and non-literal `exec()` calls |
| `security/detect-disable-mustache-escape` | Template engines with escaping disabled |
| `security/detect-eval-with-expression` | `eval(variable)` - arbitrary code execution |
| `security/detect-new-buffer` | `new Buffer(non-literal)` - deprecated unsafe API |
| `security/detect-no-csrf-before-method-override` | Express middleware ordering that bypasses CSRF |
| `security/detect-non-literal-fs-filename` | `fs` calls with variable filenames - path traversal |
| `security/detect-non-literal-regexp` | `RegExp(variable)` - potential ReDoS |
| `security/detect-non-literal-require` | `require(variable)` - dynamic require |
| `security/detect-object-injection` | `obj[variable]` property access - prototype injection |
| `security/detect-possible-timing-attacks` | Insecure string comparisons (`==`, `===`) for secrets |
| `security/detect-pseudoRandomBytes` | `crypto.pseudoRandomBytes` and `Math.random` for security |
| `security/detect-unsafe-regex` | ReDoS-vulnerable regular expressions |

## eslint-plugin-no-unsanitized rules

Per [esp-xss][esp-xss], `configs.recommended` enables `nounsanitized/method`
and `nounsanitized/property`:

| Rule ID | Detects |
|---|---|
| `nounsanitized/method` | Unsafe calls: `insertAdjacentHTML`, `document.write`, `document.writeln` with variable arguments |
| `nounsanitized/property` | Unsafe assignments: `element.innerHTML = variable`, `element.outerHTML = variable` |

Safe alternatives per [esp-xss][esp-xss]: construct DOM nodes with
`createElement` and set `textContent` or `classList` rather than assigning
raw HTML strings.

## CI workflow (GitHub Actions)

```yaml
# .github/workflows/security-lint.yml
name: Security Lint
on: [push, pull_request]

jobs:
  eslint-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: npm ci
      - name: Run security lint (JSON for triager)
        run: |
          npx eslint \
            --format json \
            --output-file eslint-security.json \
            "src/**/*.{js,ts}" || true
      - name: Run security lint (SARIF for Code Scanning)
        run: |
          npx eslint \
            --format @microsoft/eslint-formatter-sarif \
            --output-file eslint-security.sarif \
            "src/**/*.{js,ts}"; exit $?
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: eslint-security.sarif
```

The JSON pass uses `|| true` so SARIF upload still runs on failure; the
SARIF pass propagates the real exit code so the job fails on errors.
