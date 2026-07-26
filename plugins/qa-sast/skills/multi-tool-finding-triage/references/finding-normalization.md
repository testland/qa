# Finding normalization and dedupe

How each scanner report becomes a list of canonical `Finding` records, and how
those records are deduplicated across tools while recording multi-scanner
consensus. Steps 2 and 3 of `multi-tool-finding-triage` reference this file.

## The canonical Finding

Every report becomes a list of records with this shape. Fields marked optional
are populated only where the source domain supplies them.

```typescript
interface Finding {
  scanner: string;          // producing tool, lowercase id
  rule_id: string;          // native rule identifier, verbatim
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;          // one-line human description
  // location: at least one group is required
  file?: string; line?: number;                    // source / config scanners
  url?: string; method?: string; parameter?: string;  // dynamic web scanners
  package?: string;         // dependency + container scanners: eco:name@version
  // classification
  cwe?: string;             // "CWE-89"
  cve?: string;             // "CVE-2021-44228" or "GHSA-xxxx"
  finding_class?: string;   // canonical class: "SQL_INJECTION", "XSS", ...
  secret_class?: string;    // "AWS Access Key", "GitHub PAT", ...
  verified?: boolean;       // secret scanners: live-verified credential
  // enrichment (see cve-enrichment.md)
  cvss_base?: number;       // 0.0 - 10.0
  epss?: number;            // 0.0 - 1.0
  in_kev?: boolean; vex_status?: string; reachable?: boolean;
  fix_available?: string;   // version or config change that resolves it
  caught_by: string[];      // every scanner that produced this finding
}
```

## Reading the native report

Two report shapes cover most tools:

- **SARIF.** A SARIF run reports each finding as a `result` object whose
  `ruleId` is "a stable value which an analysis tool associates with a rule",
  whose `locations[]` gives the physical file position, and whose optional
  `properties` bag carries tool-specific extras (OASIS SARIF v2.1.0 sections
  3.27.5, 3.27.12, 3.8, and 3.27.10 for `level`:
  https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/sarif-v2.1.0-errata01-os-complete.html).
- **Tool-native JSON.** Read the field names from that tool's own documentation
  and map them onto the interface above. Record the tool version, because native
  field names and rule ids drift between releases.

## Severity normalization

Collapse every native vocabulary onto the five-value scale above. Three anchors
make the mapping defensible instead of arbitrary:

| Source signal | Mapping | Anchor |
|---|---|---|
| CVSS base score | 9.0 to 10.0 critical, 7.0 to 8.9 high, 4.0 to 6.9 medium, 0.1 to 3.9 low, 0.0 none | CVSS v3.1 qualitative severity rating scale, Table 14: https://www.first.org/cvss/v3.1/specification-document |
| SARIF `security-severity` property (numeric string) | over 9.0 critical, 7.0 to 8.9 high, 4.0 to 6.9 medium, 0.1 to 3.9 low; 0.0 or out of range means no security severity | https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning |
| SARIF `result.level` | `error` to high, `warning` to medium, `note` to low, `none` to info | Permitted values are `none`, `note`, `warning`, `error` per SARIF v2.1.0 section 3.27.10 (link above) |

For a tool that emits only its own labels and no CVSS or SARIF level, keep a
per-tool mapping table in the repository, sourced from that tool's documentation
and versioned next to the triage script: label sets change between tool
versions, so the mapping is data, not pipeline code.

Two rules govern the mapping. Map **up**, never down: when two tools disagree on
the same deduped finding, keep the highest severity. And never invent a severity
for a tool that reports none: use `info` and say so in the report.

## Dedupe key per domain

The dedupe key is the smallest tuple that identifies the same underlying defect
across tools. It is domain-specific:

| Domain | Dedupe key |
|---|---|
| Static code analysis | `(file, line, cwe or rule_id)` |
| Dynamic web scanning | `(url, method, parameter, finding_class)` |
| Secret detection | `(file, line, secret_class)` |
| Dependency and container CVEs | `(cve, package)` |
| Infrastructure policy | `(file, line, normalized_issue_class)` |

Dynamic scanners and policy scanners need one extra step before the key is
usable: **class normalization.** Each tool names the same defect differently, so
map native rule ids onto a canonical class token (`SQL_INJECTION`, `XSS`,
`PATH_TRAVERSAL`, and so on) and key on the canonical token. Keep the mapping in
a versioned file; rule ids evolve.

```python
SEVERITY_RANK = {'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1}

def dedupe(findings, key_fn):
    seen = {}
    for f in findings:
        key = key_fn(f)
        if key not in seen:
            seen[key] = {**f, 'caught_by': []}
        elif SEVERITY_RANK.get(f['severity'], 0) > SEVERITY_RANK.get(seen[key]['severity'], 0):
            merged = {**f, 'caught_by': seen[key]['caught_by']}
            seen[key] = merged
        seen[key]['caught_by'].append(f['scanner'])
    return list(seen.values())
```

## Consensus and secret classification

`caught_by` is the point of the merge, not a byproduct. A finding reported by two
or more independent tools is a **consensus** finding: higher confidence, lower
chance of being a false positive, and the first thing the report should surface.
Print the consensus count in the report header ("47 findings after
deduplication; 23 multi-scanner consensus").

Consensus also drives classification where tools differ in verification
capability. Secret detection is the clearest case:

| Class | Condition |
|---|---|
| Verified | A tool confirmed the credential live. TruffleHog reports `"Verified":true` after "programmatic verification against the API that we think it belongs to" (https://github.com/trufflesecurity/trufflehog) |
| Unverified consensus | `verified` false, but two or more tools flagged the same tuple |
| Inconclusive | `verified` false, single tool only. Detectors that match on regex and entropy alone, such as gitleaks (https://github.com/gitleaks/gitleaks), never set `verified` |
