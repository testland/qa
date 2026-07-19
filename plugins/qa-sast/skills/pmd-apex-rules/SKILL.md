---
name: pmd-apex-rules
description: "Runs PMD's built-in Apex security ruleset (`category/apex/security.xml`) against Salesforce Apex source to detect injection, privilege-escalation, cryptographic, and XSS vulnerabilities; configures custom rulesets for regulated-industry Apex codebases; emits SARIF for GitHub Code Scanning upload; integrates `pmd check` as a PR-blocking CI gate. Use when the codebase contains Salesforce Apex and the team needs SAST coverage for ApexSOQLInjection, ApexCRUDViolation, ApexSharingViolations, or the full 10-rule security category."
metadata:
  keywords: "apex, salesforce, pmd, sast, soql-injection, security, sarif"
---

# pmd-apex-rules

## Overview

Per [pmd.github.io - Apex Security Rules][pmd-apex-sec]:

PMD ships a built-in `category/apex/security.xml` ruleset that covers 10
security rules for Salesforce Apex. All 10 rules are present since PMD 5.5.3
and carry Medium (3) priority by default. The ruleset addresses the
Salesforce-specific threat model: SOQL injection, object/field-level security
bypass, sharing-model evasion, hard-coded credentials, insecure endpoints,
XSS through Visualforce, and open redirect.

This skill is the Apex-specific companion to
[`semgrep-rules`](../semgrep-rules/SKILL.md) and
[`sonarqube-rules`](../sonarqube-rules/SKILL.md). Those tools cover general
multi-language patterns; this one covers the Salesforce Apex security category
absent from both. Findings from all five SAST tools can be unified in a
multi-scanner triage step.

## When to use

- The repo contains Salesforce Apex (`.cls`, `.trigger`) and requires SAST
  gating in CI.
- Regulated-industry teams (financial services, healthcare, government) need
  documented evidence of permission checks and sharing-mode enforcement.
- The team already runs PMD on Java and wants a consistent runner for Apex.
- Security review asks for SOQL injection, CRUD/FLS bypass, or sharing
  violation detection.

## Step 1 - Install

Per [pmd.github.io - Installation][pmd-install], PMD requires Java 8 or later.
Download the zip from the [GitHub releases page][pmd-releases], unzip, and add
`bin/` to `PATH`:

```bash
# Linux / macOS
unzip pmd-dist-*.zip -d ~/pmd
export PATH="$HOME/pmd/bin:$PATH"

# Verify
pmd --version
```

For CI, prefer the Docker image or the Maven/Gradle plugin to avoid zip
management. The Docker image is available at `ghcr.io/pmd/pmd`.

[pmd-install]: https://pmd.github.io/pmd/pmd_userdocs_installation.html
[pmd-releases]: https://github.com/pmd/pmd/releases

## Step 2 - First scan with the built-in security ruleset

Per [pmd.github.io - CLI Reference][pmd-cli]:

```bash
pmd check -d . -R category/apex/security.xml -f sarif -r pmd-apex.sarif
```

Flag reference (per [pmd-cli][pmd-cli]):

| Flag | Meaning |
|------|---------|
| `-d <path>` | Source directory or file to analyze |
| `-R <refs>` | Ruleset path; comma-separated for multiple |
| `-f <format>` | Output format (`sarif`, `text`, `xml`, `json`, `html`; default: `text`) |
| `-r <file>` | Write report to file instead of stdout |
| `--minimum-priority <n>` | Skip rules below priority n (1=High, 5=Info) |
| `--cache <file>` | Enable incremental analysis (per [pmd-cache][pmd-cache]) |

Exit codes (per [pmd-cli][pmd-cli]):

| Code | Meaning |
|------|---------|
| 0 | Success, no violations |
| 1 | Unhandled exception |
| 2 | Invalid arguments |
| 4 | Violations detected |
| 5 | Recoverable parsing errors |

[pmd-cli]: https://pmd.github.io/pmd/pmd_userdocs_cli_reference.html
[pmd-cache]: https://pmd.github.io/pmd/pmd_userdocs_incremental_analysis.html

## Step 3 - The 10 Apex security rules

Per [pmd.github.io - Apex Security Rules][pmd-apex-sec]:

[pmd-apex-sec]: https://pmd.github.io/pmd/pmd_rules_apex_security.html

| Rule | What it detects |
|------|-----------------|
| `ApexSOQLInjection` | Dynamic SOQL/DML built by string concatenation with untrusted input |
| `ApexCRUDViolation` | Missing object/field permission check before SOQL, SOSL, or DML |
| `ApexSharingViolations` | Classes performing DML without an explicit sharing keyword |
| `ApexBadCrypto` | Hard-coded IVs or keys in cryptographic operations |
| `ApexDangerousMethods` | Calls to `Configuration.disableTriggerCRUDSecurity()` or sensitive `System.debug()` |
| `ApexInsecureEndpoint` | Plain HTTP (non-HTTPS) callout endpoints |
| `ApexOpenRedirect` | Redirects using unsanitized user-controlled input |
| `ApexSuggestUsingNamedCred` | Hard-coded credentials in HTTP headers; suggests Named Credentials |
| `ApexXSSFromEscapeFalse` | `addError()` called with escape disabled, exposing raw user content |
| `ApexXSSFromURLParam` | URL parameters used in output contexts without escaping |

### ApexSOQLInjection detail

Per [pmd-apex-sec][pmd-apex-sec]: "Detects the usage of untrusted / unescaped
variables in DML queries."

Non-compliant:

```apex
public class Foo {
    public void test1(String t1) {
        Database.query('SELECT Id FROM Account' + t1);
    }
}
```

Compliant (bind variable - automatically sanitized by the Apex runtime):

```apex
public class Foo {
    public void test1(String accountName) {
        List<Account> accounts = [SELECT Id FROM Account WHERE Name = :accountName];
    }
}
```

### ApexCRUDViolation detail

Per [pmd-apex-sec][pmd-apex-sec]: "The rule validates you are checking for
access permissions before a SOQL/SOSL/DML operation." Accepted remediation
paths include `DescribeSObjectResult` system checks, `WITH SECURITY_ENFORCED`,
or (since Winter '23 / API v56) `WITH USER_MODE`.

The rule is configurable for custom authorization facades via regex properties
(`createAuthMethodPattern`, `readAuthMethodPattern`, etc.) so teams using an
internal ESAPI wrapper can still pass the check per [pmd-apex-sec][pmd-apex-sec].

### ApexSharingViolations detail

Per [pmd-apex-sec][pmd-apex-sec]: "Detect classes declared without explicit
sharing mode if DML methods are used." The three accepted keywords are `with
sharing`, `without sharing`, and `inherited sharing`. The intent is to force
a conscious declaration of sharing posture, not to mandate a specific value.

## Step 4 - Custom ruleset (subset or extended)

Per [pmd.github.io - Making Rulesets][pmd-rulesets]:

[pmd-rulesets]: https://pmd.github.io/pmd/pmd_userdocs_making_rulesets.html

Use a custom XML ruleset to select a subset, override priorities, or add
exclusion patterns for generated code:

```xml
<?xml version="1.0"?>
<ruleset name="Apex Security - Regulated"
    xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0
    https://pmd.sourceforge.io/ruleset_2_0_0.xsd">
  <description>Apex security rules for regulated-industry Apex</description>

  <!-- Include the full security category -->
  <rule ref="category/apex/security.xml">
    <!-- Suppress for auto-generated WSDL stubs -->
    <exclude name="ApexSuggestUsingNamedCred"/>
  </rule>

  <!-- Exclude generated code directories -->
  <exclude-pattern>.*/generated/.*</exclude-pattern>
</ruleset>
```

Run with the custom ruleset:

```bash
pmd check -d force-app/main/default/classes \
          -R config/pmd-apex-regulated.xml \
          -f sarif \
          -r pmd-apex.sarif
```

Per [pmd-rulesets][pmd-rulesets], referencing an entire category means the
ruleset automatically picks up new rules added to that category in future PMD
versions. Pin specific versions in CI to avoid unexpected gate changes.

## Step 5 - Incremental analysis for faster CI

Per [pmd-cache][pmd-cache] (PMD 5.6.0+):

```bash
pmd check -d force-app/main/default/classes \
          -R category/apex/security.xml \
          -f sarif \
          -r pmd-apex.sarif \
          --cache .pmd-cache/apex.cache
```

The cache stores file checksums. Unchanged files reuse cached results; only
modified files are re-analyzed. The generated report is identical to a full
run (per [pmd-cache][pmd-cache]). Cache is invalidated automatically on PMD
version change, ruleset modification, or auxclasspath change.

## Step 6 - CI gate (GitHub Actions)

```yaml
jobs:
  pmd-apex:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download PMD
        run: |
          PMD_VERSION=7.7.0
          curl -Lo pmd.zip \
            https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-dist-${PMD_VERSION}-bin.zip
          unzip -q pmd.zip -d pmd-dist
          echo "$PWD/pmd-dist/pmd-bin-${PMD_VERSION}/bin" >> $GITHUB_PATH

      - name: Run PMD Apex security scan
        run: |
          pmd check \
            -d force-app/main/default/classes \
            -R category/apex/security.xml \
            -f sarif \
            -r pmd-apex.sarif \
            --cache .pmd-cache/apex.cache
        # Exit code 4 = violations found (per pmd-cli); gate blocks on non-zero
        continue-on-error: false

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: pmd-apex.sarif
          category: pmd-apex
```

Per [pmd-cli][pmd-cli], exit code 4 means violations detected. `continue-on-error: false` blocks the PR on any finding. Use `--minimum-priority 2` to gate only on High and Critical findings while still uploading all findings via SARIF.

## Step 7 - Suppression

PMD suppression in Apex (per [pmd-apex-sec][pmd-apex-sec]): annotate the
method or class with `@SuppressWarnings`:

```apex
@SuppressWarnings('PMD.ApexCRUDViolation')
public class VisualforceGetter {
    // Visualforce getters auto-enforce FLS; CRUD check is redundant here
    public List<Account> getAccounts() {
        return [SELECT Id, Name FROM Account];
    }
}
```

Add a comment explaining the justification. Suppressions without rationale
are flagged in code review.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Running against all directories including `classes/test` | Test classes generate false positives for CRUD/sharing | Exclude test directories with `<exclude-pattern>` |
| No `--cache` in CI on large orgs | Full re-scan of 500+ classes on every commit is slow | Add `--cache .pmd-cache/apex.cache` (Step 5) |
| Suppressing `ApexSOQLInjection` globally | Masks real injection risks | Suppress per method with a written justification only |
| Floating `latest` PMD version in CI | Gate breaks when a new rule fires unexpectedly | Pin the `PMD_VERSION` variable |
| Custom auth facade without `*AuthMethodPattern` config | All CRUD-checked methods still flagged as violations | Configure `createAuthMethodPattern` etc. per [pmd-apex-sec][pmd-apex-sec] |

## Limitations

- PMD Apex analysis is syntactic, not data-flow-based; it can miss taint
  paths that cross method boundaries. For deep interprocedural analysis pair
  with [`codeql-queries`](../codeql-queries/SKILL.md).
- `ApexCRUDViolation` generates false positives on Visualforce getter methods
  where FLS is enforced automatically; suppress with justification per Step 7.
- PMD does not parse Lightning Web Components (`.js`); client-side XSS is out
  of scope. Use [`semgrep-rules`](../semgrep-rules/SKILL.md) with the
  `p/owasp-top-ten` ruleset for LWC JavaScript.

## References

- [pmd-apex-sec][pmd-apex-sec] - all 10 Apex security rules, properties, examples
- [pmd-cli][pmd-cli] - full CLI reference, flags, exit codes
- [pmd-install][pmd-install] - installation
- [pmd-rulesets][pmd-rulesets] - custom ruleset XML format, exclude patterns
- [pmd-cache][pmd-cache] - incremental analysis
- [pmd.github.io - Report Formats][pmd-formats] - all `-f` format options including sarif
- [`semgrep-rules`](../semgrep-rules/SKILL.md) - multi-language pattern SAST
- [`codeql-queries`](../codeql-queries/SKILL.md) - interprocedural / data-flow SAST
- [`sonarqube-rules`](../sonarqube-rules/SKILL.md) - semantic-DB SAST

[pmd-formats]: https://pmd.github.io/pmd/pmd_userdocs_report_formats.html
