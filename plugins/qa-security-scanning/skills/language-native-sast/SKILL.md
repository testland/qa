---
name: language-native-sast
description: "Language-native SAST linters - the first-party \"linter as SAST\" family that runs inside each ecosystem's standard toolchain with no separate scanner server: Bandit (Python, 60+ B-rules, severity x confidence filtering), gosec (Go, 40+ G-rules, AST + SSA taint tracking, golangci-lint integration), eslint-plugin-security + eslint-plugin-no-unsanitized (JS/TS, 14 detect-* rules + DOM-sink XSS), and PMD's Apex security ruleset (Salesforce, ApexSOQLInjection / ApexCRUDViolation / ApexSharingViolations). Covers the shared adoption pattern - install as a dev dependency, first scan, suppression-with-justification discipline, baseline-diff adoption for legacy code, SARIF output + CI gating - with per-tool depth in references. Use when a repo needs in-toolchain security linting for Python, Go, JavaScript/TypeScript, or Apex; for cross-language or cross-file taint analysis use semgrep-rules / codeql-queries instead."
---

# language-native-sast

## Overview

Every major ecosystem ships a first-party security linter that runs inside
the toolchain developers already use - no scanner server, no new binary in
the inner loop. This family trades depth for adoption cost: rules are
single-file and pattern-based, but the feedback lands in the editor and on
every commit, which is where shallow bugs (hardcoded creds, `shell=True`,
`innerHTML =`, dynamic SOQL) actually get fixed.

| Language | Tool | Reference |
|---|---|---|
| Python | Bandit (PyCQA) | [references/bandit.md](references/bandit.md) |
| Go | gosec (securego), via golangci-lint | [references/gosec.md](references/gosec.md) |
| JS / TS | eslint-plugin-security + eslint-plugin-no-unsanitized | [references/eslint-security.md](references/eslint-security.md) |
| Salesforce Apex | PMD `category/apex/security.xml` | [references/pmd-apex.md](references/pmd-apex.md) |

All four follow the same adoption pattern (below). The worked example uses
the ESLint pair - the biggest audience; the per-tool references carry the
full flag/rule catalogs, verified against each tool's docs.

Differentiation: these linters are single-file and (mostly) syntactic.
For cross-language pattern rules use `semgrep-rules`; for cross-file taint
tracking use `codeql-queries`; to merge their findings with other scanners
into one gate use `multi-tool-finding-triage`.

## When to use

- The repo is Python, Go, JS/TS, or Apex and the team wants shift-left
  security feedback in the editor and on every commit, not only in a
  scheduled CI scan.
- CI needs a fast, PR-blocking security lint pass without adopting a
  scanner server or a new SaaS.
- A legacy codebase is adopting security linting and pre-existing findings
  must not block every PR (baseline-diff pattern, Step 3).

## The pattern

Each tool's exact commands live in its reference; the workflow is shared.

### Step 1 - Install as a dev dependency

The linter installs through the ecosystem's own package manager - it
versions, caches, and updates like any other dev dependency:

```bash
pip install bandit[toml]                        # Python
go install github.com/securego/gosec/v2/cmd/gosec@latest   # Go
npm install --save-dev eslint-plugin-security eslint-plugin-no-unsanitized  # JS/TS
# Apex: PMD zip / Docker image (Java 8+) - see references/pmd-apex.md
```

### Step 2 - First scan, then filter the noise

Run the recursive scan, then immediately narrow with the tool's
severity/confidence filters - every tool in this family is noisy at
default settings, and an unfiltered first run is how teams end up
disabling the linter:

```bash
bandit -r . --severity-level=medium --confidence-level=medium
gosec -severity=high -confidence=high ./...
npx eslint "src/**/*.{js,ts}"      # rules pre-scoped by the shared config
pmd check -d . -R category/apex/security.xml --minimum-priority 2
```

### Step 3 - Baseline-diff adoption for legacy code

On a legacy codebase, capture the current findings once and gate only on
NEW findings, so the debt is tracked without blocking every PR:

- Bandit: `bandit -r . -f json -o old-findings.json`, then
  `bandit -r . --baseline old-findings.json` in CI.
- The generic pattern for the other tools: run the scan on main, save the
  report, diff per-PR findings against it and fail only on additions
  (`multi-tool-finding-triage` implements this diff + waiver flow).
- Re-baseline on a schedule; persisted findings need waiver entries.

### Step 4 - Suppression with justification (MANDATORY)

Every tool has an inline suppression syntax; every suppression carries a
reason, reviewer, and expiry, audited quarterly:

| Tool | Inline syntax |
|---|---|
| Bandit | `# nosec B602` (always with the rule ID) |
| gosec | `// #nosec G401 -- Reason: ...` |
| ESLint | `// eslint-disable-next-line security/detect-object-injection` + reason comment |
| PMD Apex | `@SuppressWarnings('PMD.ApexCRUDViolation')` + reason comment |

Bare suppressions (no rule ID, no reason) are unreviewed debt - grep for
them in the quarterly audit. Categorical noise (a rule that can never
apply) belongs in the tool's config file, not scattered inline.

### Step 5 - CI wiring: SARIF + exit-code gate

All four tools emit SARIF for GitHub Code Scanning and gate CI via exit
code. The shape is identical per tool - scan, upload SARIF `if: always()`,
let the exit code block the PR:

```yaml
      - run: bandit -r . -f sarif -o bandit.sarif        # or gosec / eslint / pmd
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: bandit.sarif }
```

JSON output from each tool feeds `multi-tool-finding-triage` for the
cross-scanner dedupe + waiver gate.

## Worked example - ESLint security pair (JS/TS)

Per [github.com/eslint-community/eslint-plugin-security][esp-sec] and
[github.com/mozilla/eslint-plugin-no-unsanitized][esp-xss]:

[esp-sec]: https://github.com/eslint-community/eslint-plugin-security
[esp-xss]: https://github.com/mozilla/eslint-plugin-no-unsanitized

```js
// eslint.config.js (flat config, ESLint 8.23+ / 9+)
import pluginSecurity from "eslint-plugin-security";
import nounsanitized from "eslint-plugin-no-unsanitized";

export default [
  pluginSecurity.configs.recommended,   // all 14 detect-* rules
  nounsanitized.configs.recommended,    // method + property DOM-sink rules
];
```

A scan of this code:

```js
const userData = req.body;
element.innerHTML = userData.bio;             // nounsanitized/property
const file = fs.readFileSync(req.query.path); // security/detect-non-literal-fs-filename
```

reports both findings; the safe rewrites are `element.textContent = ...`
(or DOMPurify for rich HTML) and an allowlist check on the path. The
highest-volume false positive is `security/detect-object-injection` (any
`obj[key]` access) - triage it per Step 4 or downgrade it to `warn` in
config. SARIF output uses the scoped formatter name in full:

```bash
npx eslint --format @microsoft/eslint-formatter-sarif \
  --output-file eslint-security.sarif "src/**/*.{js,ts}"
```

ESLint exit codes per [eslint.org/docs/latest/use/command-line-interface][eslint-cli]:
`0` clean, `1` errors (the gate), `2` config error. Full rule tables,
the legacy-config variant, and the complete two-pass CI workflow (JSON
for the triager + SARIF for Code Scanning) are in
[references/eslint-security.md](references/eslint-security.md).

[eslint-cli]: https://eslint.org/docs/latest/use/command-line-interface

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Unfiltered first scan on a legacy repo | Noise overwhelms; team disables the linter | Severity/confidence filters (Step 2) + baseline (Step 3) |
| Bare suppression without rule ID | Suppresses ALL rules on that line | Always name the rule (Step 4) |
| Suppression without reason + expiry | Permanent unreviewed debt | Justification template, quarterly audit (Step 4) |
| Running the linter only in scheduled CI | Loses the in-editor shift-left benefit | Dev-dependency install + pre-commit (Step 1) |
| Treating linter pass as full SAST coverage | Single-file, mostly syntactic analysis | Layer semgrep-rules / codeql-queries |

## Limitations

- Single-file analysis: none of the four track taint across module or
  package boundaries (gosec's SSA taint tracking is in-package). Use
  `codeql-queries` for interprocedural flows.
- Rule depth varies by ecosystem era - Bandit is thinner on FastAPI/async
  patterns, gosec on generics, PMD Apex does not parse Lightning Web
  Components (use `semgrep-rules` for LWC JavaScript).
- High-volume false-positive rules exist in each tool
  (`detect-object-injection`, G104, B101, `ApexCRUDViolation` on
  Visualforce getters) - the per-tool references name them and the
  sanctioned handling.

## References

- [references/bandit.md](references/bandit.md) - Bandit: rules, flags,
  pyproject config, pre-commit, baseline
- [references/gosec.md](references/gosec.md) - gosec: G-rule catalog,
  golangci-lint integration, `#nosec` syntax
- [references/eslint-security.md](references/eslint-security.md) - ESLint
  pair: 14+2 rule tables, SARIF formatter, CI workflow
- [references/pmd-apex.md](references/pmd-apex.md) - PMD Apex: 10-rule
  security category, custom rulesets, incremental cache
- `semgrep-rules`, `codeql-queries`, `sonarqube-rules` - deeper /
  cross-language SAST siblings
- `multi-tool-finding-triage` - cross-scanner dedupe + waiver gate
