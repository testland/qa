---
name: eslint-security-rules
description: "Configures and runs `eslint-plugin-security` (14 detect-* rules covering injection, path traversal, ReDoS, unsafe buffers, and bidi trojan-source) plus `eslint-plugin-no-unsanitized` (DOM XSS via `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`) as the JS/TS first-party SAST layer; covers flat config setup, per-rule suppression with justification templates, SARIF output via `@microsoft/eslint-formatter-sarif` for GitHub Code Scanning upload, and CI gating on ESLint exit code 1. Use when the project is JS or TS and needs an in-process security lint pass without a separate SAST server."
rating: 23
d6: 3
---

# eslint-security-rules

## Overview

Two npm plugins add a security-focused lint layer that runs inside the
standard ESLint pipeline with no external server or daemon required.

Per [github.com/eslint-community/eslint-plugin-security][esp-sec]:

[esp-sec]: https://github.com/eslint-community/eslint-plugin-security

> "This project will help identify potential security hotspots, but
> finds a lot of false positives which need triage by a human."

Per [github.com/mozilla/eslint-plugin-no-unsanitized][esp-xss]:

[esp-xss]: https://github.com/mozilla/eslint-plugin-no-unsanitized

The `no-unsanitized` plugin provides "basic security checks" for DOM
sink operations that are the primary source of DOM-based XSS - an
attack class that Semgrep pattern rules can miss when the taint path
crosses async call boundaries.

Together they fill the JS/TS gap the `sast-finding-triager` agent
exposes when only Semgrep/SonarQube/CodeQL are configured: inline
rules that fire at `eslint` invocation time, producing JSON or SARIF
output the triager can consume.

## When to use

- The repo is JS or TS and has an existing ESLint config.
- The team wants shift-left security feedback in the editor and on
  every commit, not only in a scheduled CI scan.
- The project uses DOM APIs (`innerHTML`, `insertAdjacentHTML`,
  `document.write`) that need sink-level XSS coverage.
- The team needs SARIF output for GitHub Code Scanning without
  adopting a new scanner binary.

## Step 1 - Install

Per [esp-sec][esp-sec]:

```bash
npm install --save-dev eslint-plugin-security
```

Per [esp-xss][esp-xss]:

```bash
npm install --save-dev eslint-plugin-no-unsanitized
```

For SARIF output, per
[github.com/microsoft/sarif-js-sdk][sarif-sdk]:

[sarif-sdk]: https://github.com/microsoft/sarif-js-sdk/tree/main/packages/eslint-formatter-sarif

```bash
npm install --save-dev @microsoft/eslint-formatter-sarif
```

## Step 2 - Flat config setup (ESLint 8.23+ and ESLint 9+)

Per [esp-sec][esp-sec] and [esp-xss][esp-xss]:

```js
// eslint.config.js
import pluginSecurity from "eslint-plugin-security";
import nounsanitized from "eslint-plugin-no-unsanitized";

export default [
  pluginSecurity.configs.recommended,
  nounsanitized.configs.recommended,
];
```

`pluginSecurity.configs.recommended` enables all 14 `detect-*` rules.
`nounsanitized.configs.recommended` enables `nounsanitized/method`
and `nounsanitized/property`.

For legacy `.eslintrc` configs, per [esp-sec][esp-sec]:

```js
module.exports = {
  extends: ["plugin:security/recommended-legacy"],
};
```

## Step 3 - Rule catalog

### eslint-plugin-security rules

Per [esp-sec][esp-sec]:

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

### eslint-plugin-no-unsanitized rules

Per [esp-xss][esp-xss]:

| Rule ID | Detects |
|---|---|
| `nounsanitized/method` | Unsafe calls: `insertAdjacentHTML`, `document.write`, `document.writeln` with variable arguments |
| `nounsanitized/property` | Unsafe assignments: `element.innerHTML = variable`, `element.outerHTML = variable` |

Safe alternatives per [esp-xss][esp-xss]: construct DOM nodes with
`createElement` and set `textContent` or `classList` rather than
assigning raw HTML strings.

## Step 4 - False-positive triage

`security/detect-object-injection` is the highest-volume false
positive: any `obj[key]` access triggers it, including safe patterns
like array indexing. Standard triage approaches:

**Per-line suppression with mandatory justification:**

```js
// eslint-disable-next-line security/detect-object-injection
// Reason: key is validated against allowedKeys before this point
// Reviewer: eng@example.com (2026-06-04)
// Expires: 2026-12-04
const value = config[key];
```

**Block-level suppression for generated or vendored code:**

```js
/* eslint-disable security/detect-object-injection */
// Reason: auto-generated lookup table; keys are compile-time constants
/* eslint-enable security/detect-object-injection */
```

**Rule-level severity downgrade when a rule produces only noise on a
specific codebase:**

```js
// eslint.config.js
export default [
  pluginSecurity.configs.recommended,
  {
    rules: {
      "security/detect-object-injection": "warn", // downgrade from error
    },
  },
];
```

Suppression cadence: audit all `eslint-disable` comments quarterly.
Suppressions without `Reason:` + `Reviewer:` + `Expires:` are treated
as unreviewed debt.

## Step 5 - SARIF output for GitHub Code Scanning

Per [sarif-sdk][sarif-sdk], the `@microsoft/eslint-formatter-sarif`
package cannot be invoked with the abbreviated `-f sarif` form because
its name is scoped. Use the full package name:

```bash
npx eslint \
  --format @microsoft/eslint-formatter-sarif \
  --output-file eslint-security.sarif \
  "src/**/*.{js,ts}"
```

To embed analyzed source content in the SARIF output:

```bash
SARIF_ESLINT_EMBED=true npx eslint \
  --format @microsoft/eslint-formatter-sarif \
  --output-file eslint-security.sarif \
  "src/**/*.{js,ts}"
```

Upload to GitHub Code Scanning:

```yaml
- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: eslint-security.sarif
```

## Step 6 - CI integration with gating

Per [eslint.org/docs/latest/use/command-line-interface][eslint-cli]:

[eslint-cli]: https://eslint.org/docs/latest/use/command-line-interface

ESLint exit codes: `0` = no errors; `1` = errors found; `2` = config
error. Use exit code `1` as the CI gate signal.

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

The JSON pass uses `|| true` so SARIF upload still runs on failure;
the SARIF pass propagates the real exit code so the job fails on
errors.

## Step 7 - Passing JSON output to sast-finding-triager

Per [eslint-cli][eslint-cli], `--format json` produces an array of
file result objects, each with a `messages` array containing `ruleId`,
`severity`, `line`, `column`, and `message`. Pass `eslint-security.json`
to the [`sast-finding-triager`](../../agents/sast-finding-triager.md)
as an additional input alongside `semgrep.json` and other scanner
outputs. The triager normalizes `ruleId` to CWE for deduplication.

## Example

**Triggering finding:**

```js
const userData = req.body;
element.innerHTML = userData.bio; // nounsanitized/property
const file = fs.readFileSync(req.query.path); // security/detect-non-literal-fs-filename
```

**ESLint output (stylish):**

```
src/profile.js
  12:3  error  Unsafe assignment to innerHTML  nounsanitized/property
  18:3  error  Found non-literal argument to readFileSync  security/detect-non-literal-fs-filename
```

**Safe rewrites:**

```js
// XSS: use textContent for plain text; DOMPurify for rich HTML
element.textContent = userData.bio;
// or: element.setHTML(sanitize(userData.bio));

// Path traversal: validate against an allowlist
const allowed = ["/var/data/a.txt", "/var/data/b.txt"];
if (!allowed.includes(req.query.path)) throw new Error("invalid path");
const file = fs.readFileSync(req.query.path);
```

## Limitations

- `detect-object-injection` fires on all variable-keyed property
  accesses; expect high false-positive volume on data-heavy code.
  Pair with a code review step rather than blocking CI on it alone.
- Neither plugin performs cross-file taint tracking; for taint flow
  across module boundaries, pair with
  [`semgrep-rules`](../semgrep-rules/SKILL.md) or
  [`codeql-queries`](../codeql-queries/SKILL.md).
- `eslint-plugin-security` does not cover server-side template
  injection or SQL injection natively; use Semgrep `p/owasp-top-ten`
  for those patterns.
- Rules run at parse time, not at runtime; dynamic injection via
  `eval` called through a proxy chain will not be caught.

## References

- [esp-sec][esp-sec] - full rule list, installation, flat config + legacy config
- [esp-xss][esp-xss] - method and property rules, safe DOM alternatives
- [sarif-sdk][sarif-sdk] - `@microsoft/eslint-formatter-sarif`, scoped `-f` usage, `SARIF_ESLINT_EMBED`
- [eslint-cli][eslint-cli] - `--format`, `--output-file`, exit codes
- [`semgrep-rules`](../semgrep-rules/SKILL.md),
  [`codeql-queries`](../codeql-queries/SKILL.md),
  [`sonarqube-rules`](../sonarqube-rules/SKILL.md) - complementary scanners
- [`sast-finding-triager`](../../agents/sast-finding-triager.md) - multi-scanner unifier that consumes this skill's JSON output
