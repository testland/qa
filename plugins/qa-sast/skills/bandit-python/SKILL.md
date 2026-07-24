---
name: bandit-python
description: "Configures and runs Bandit - Python-specific SAST from the OpenStack security plugin set covering 60+ rule IDs across 7 categories (B1xx misc, B2xx application, B3xx blacklists/cryptography, B4xx imports, B5xx, B6xx injections, B7xx XSS); supports `bandit -r .` recursive scan, `--severity-level low|medium|high`, `--confidence-level low|medium|high` filtering, `# nosec` and `# nosec B404` per-line + per-rule suppressions, `pyproject.toml` `[tool.bandit]` config including `exclude_dirs`. Use when the user works with Python and needs a focused, low-overhead SAST integrated with pre-commit / CI."
---

# bandit-python

## Overview

Per [bandit.readthedocs.io/en/latest/start.html][bd-start]:

[bd-start]: https://bandit.readthedocs.io/en/latest/start.html

Bandit is the Python-specific SAST originally from OpenStack
Security. Each finding has two dimensions:

- **Severity** (LOW / MEDIUM / HIGH) - how dangerous if exploited
- **Confidence** (LOW / MEDIUM / HIGH) - how certain Bandit is the
  finding is real

The two-dimensional scoring lets you tune false-positive vs
false-negative tradeoff per project.

## When to use

- Repo has Python source (Bandit is Python-only).
- The team needs a focused Python SAST integrated with pre-commit
  + standard CI.
- Quick triage of low-effort security wins (hardcoded passwords,
  shell=True in subprocess, weak crypto).
- Pair with `semgrep-rules` (broader,
  cross-language) for layered coverage.

## Step 1 - Install

Per [bd-start][bd-start]:

```bash
pip install bandit[toml]
```

The `[toml]` extra enables `pyproject.toml` config support.

## Step 2 - Basic recursive scan

Per [bd-start][bd-start]:

```bash
bandit -r path/to/your/code
```

Common usage:

```bash
bandit -r .                              # current dir, recursive
bandit -r src/ tests/                    # multiple paths
bandit -r . -x tests,vendor              # exclude dirs
bandit -r . -ll                           # minimum LOW confidence + LOW severity
```

## Step 3 - Severity + confidence filtering

Per [bd-start][bd-start] verbatim CLI usage:

```bash
bandit examples/*.py -n 3 --severity-level=high
```

Combined two-dimensional filtering:

```bash
# Only HIGH severity findings with HIGH confidence
bandit -r . --severity-level=high --confidence-level=high

# All MEDIUM+ severity, any confidence
bandit -r . --severity-level=medium
```

The two flags compose; neither is a strict subset of the other.

## Step 4 - `pyproject.toml` config

```toml
# pyproject.toml
[tool.bandit]
exclude_dirs = ["tests", "vendor", "build"]
skips = ["B101"]                       # skip "assert used" rule globally
tests = ["B201", "B301"]                # only run flask + pickle checks (whitelist mode)

[tool.bandit.assert_used]
skips = ["**/test_*.py", "**/*_test.py"]
```

`tests = [...]` activates whitelist mode (run ONLY listed checks);
`skips = [...]` activates blacklist mode (run all checks except
listed). They're mutually exclusive.

## Step 5 - Rule ID catalog

Bandit rules are organized by category prefix:

| Prefix | Category | Examples |
|---|---|---|
| B1xx | Miscellaneous | B101 assert used, B102 exec used, B105 hardcoded password string |
| B2xx | Application/Framework | B201 flask debug=True, B202 tarfile unsafe extract |
| B3xx | Blacklists / Cryptography | B301 pickle, B303 MD5, B311 random for crypto, B321 ftplib (cleartext), B324 hashlib weak hash, B403 import_pickle |
| B4xx | Imports | B401 import_telnetlib, B404 subprocess imported, B405 import_xml_etree, B413 import_pyCrypto |
| B5xx | (less common - varies) | |
| B6xx | Injections | B602 subprocess shell=True, B603 subprocess without shell=False, B608 sql_injection, B610 django extra used (sql injection-prone) |
| B7xx | XSS / templating | B701 jinja2 autoescape false, B703 django mark_safe |

Full catalog: bandit.readthedocs.io/en/latest/plugins/.

## Step 6 - False-positive triage (MANDATORY)

Per the canonical Bandit workflow, three suppression layers:

| Mechanism | Example | When to use |
|---|---|---|
| Per-line `# nosec` | `subprocess.run(cmd, shell=True)  # nosec B602` | Single-line exception with rule ID |
| Per-rule `# nosec` | `# nosec B404` (above import statement) | Rule-specific suppression |
| `[tool.bandit] skips = ["..."]` | Per-project rule disable | Categorical disable (test fixtures, etc.) |
| `[tool.bandit] exclude_dirs = ["..."]` | Per-directory exclude | Generated code, vendored libs |

**Justification template (mandatory in code):**

```python
import subprocess
# nosec B602 - Reason: command is statically defined, no user input
# Reviewer: alice@example.com (2026-05-15)
# Expires: 2026-12-15
result = subprocess.run("ls -la /tmp", shell=True, check=True)
```

For rules that can never apply (e.g., B311 `random` is fine
outside crypto contexts), prefer per-rule disable in `pyproject.toml`
over per-line suppressions - fewer comments to maintain, easier to
audit at the project level.

Cadence: every quarter, grep for `# nosec` patterns lacking
`# Reason:` lines; flag for review.

## Step 7 - Output formats

```bash
bandit -r . -f txt                      # default human-readable
bandit -r . -f json -o bandit.json      # JSON for finding triage
bandit -r . -f sarif -o bandit.sarif    # SARIF for GitHub Code Scanning
bandit -r . -f xml -o bandit.xml        # JUnit XML
bandit -r . -f html -o bandit.html      # standalone HTML report
bandit -r . -f csv -o bandit.csv        # CSV
bandit -r . -f screen                    # colorized terminal
```

## Step 8 - Pre-commit integration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.10
    hooks:
      - id: bandit
        args: ["--severity-level=medium", "--confidence-level=medium"]
        files: \.py$
        exclude: ^(tests/|venv/|.venv/)
```

## Step 9 - CI integration

```yaml
jobs:
  bandit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with: { python-version: '3.13' }
      - run: pip install bandit[toml]
      - run: bandit -r . -f sarif -o bandit.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: bandit.sarif }
```

For PR-blocking: pipe through `--severity-level high` to limit
noise.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `--severity-level=low` everywhere | Noise overwhelms; team disables | Start `--severity-level=medium`; ratchet down (Step 3) |
| `# nosec` without rule ID | Suppresses ALL rules on that line; over-broad | `# nosec B602` (specific rule, Step 6) |
| Skip `--confidence-level` filter | LOW confidence findings mostly false positives | Pair `--severity-level=high --confidence-level=medium` for triage |
| Run on tests directory | Test-only patterns (assert, pickle) trigger noise | `exclude_dirs = ["tests"]` (Step 4) |
| No baseline; every legacy finding blocks CI | Team disables Bandit | Use `--baseline old-findings.json` against a captured baseline |

## Limitations

- Python-only; for Go use `gosec-go`, for
  JS use Semgrep.
- Plugin-based detection misses some patterns that Semgrep custom
  rules can catch.
- No native cross-file taint analysis (use `codeql-queries`
  for that).
- Rule depth varies - well-maintained for OpenStack-era patterns;
  newer Python ecosystem (FastAPI, async patterns) coverage thinner.

## References

- [bd-start][bd-start] - install + basic scan reference
- bandit.readthedocs.io - full documentation
- bandit.readthedocs.io/en/latest/plugins/ - rule catalog
- github.com/PyCQA/bandit - repository
- `semgrep-rules`,
  `sonarqube-rules`,
  `codeql-queries`,
  `gosec-go` - sister scanners
