---
name: non-functional-requirement-extractor
description: "Reads a PRD, design doc, or product brief and pulls out the non-functional requirements (performance, accessibility, security, internationalization, reliability, observability) as concrete, threshold-bound, testable assertions. Maps every NFR to its measurement source (Lighthouse, axe, OWASP ASVS, WCAG criterion, etc.) so the test suite knows what to assert against. Use after gherkin-from-stories (qa-bdd) handles functional requirements."
---

# non-functional-requirement-extractor

## Overview

ISTQB defines **non-functional testing** as "A test type to evaluate
that a component or system complies with non-functional requirements"
([istqb-nft][istqb-nft]). The eight ISO/IEC 25010:2011 product-quality
characteristics define the canonical NFR categories
(cite by stable standard ID; iso.org is paywalled / Cloudflare-protected):

[istqb-nft]: https://glossary.istqb.org/en_US/term/non-functional-testing

| ISO/IEC 25010 characteristic       | Common shorthand   | This skill covers |
|------------------------------------|--------------------|-------------------|
| Functional Suitability             | functional         | (out - handled by gherkin-from-stories in qa-bdd) |
| Performance Efficiency             | performance / perf | yes               |
| Compatibility                      | compatibility       | yes               |
| Usability                          | a11y / UX           | yes (a11y subset) |
| Reliability                        | reliability         | yes               |
| Security                           | security            | yes               |
| Maintainability                    | (developer-facing)  | (out)             |
| Portability                        | (developer-facing)  | (out)             |

Plus two practitioner-emergent NFR families that are increasingly
treated as first-class:

| Family                | Source                                  |
|-----------------------|-----------------------------------------|
| Internationalization (i18n) | W3C i18n best practices             |
| Observability         | DORA / SRE practitioner literature      |

Acceptance-criteria-extractor handles **functional** requirements
(Given/When/Then). This skill handles **everything else** - the
threshold-and-measurement requirements that don't fit Gherkin's shape.

## When to use

- A PRD mentions "performance," "fast," "accessible," "secure," or
  similar - words that fail the Observable testability heuristic.
- A team is shifting from informal to formal NFRs in tickets.
- A non-functional regression is being added to a release plan and
  needs a measurable baseline.

## How to use

1. Confirm functional requirements are already covered by
   `gherkin-from-stories` (qa-bdd); this skill takes everything else.
2. Scan the doc family-by-family for the Step 1 signal phrases.
3. For each signal, run the Step 2 testability test: does it have a
   threshold, a measurement source, and a scope?
4. Rewrite each testable signal as a threshold-bound assertion; never
   invent a missing number - flag it as a threshold gap instead.
5. Map each NFR to its canonical measurement source per Step 3
   ([references/measurement-sources.md](references/measurement-sources.md)).
6. Emit the Output-format tables plus a "Threshold gaps (HUMAN INPUT
   REQUIRED)" list, and return it to the author for confirmation.

## Step 1 - Scan the doc for each NFR family

Per family, look for the canonical signal phrases:

| Family            | Signal phrases                                          |
|-------------------|---------------------------------------------------------|
| Performance       | "fast", "responsive", "within Xms", "p95", "throughput", "latency", "time to" |
| Accessibility     | "WCAG", "screen reader", "keyboard navigation", "color contrast", "ARIA" |
| Security          | "auth", "encrypt", "OWASP", "CSP", "rate limit", "secret" |
| Compatibility     | "browser", "iOS", "Android", "version", "device" |
| Reliability       | "uptime", "SLO", "SLA", "graceful degradation", "circuit breaker", "retry" |
| Internationalization | "locale", "RTL", "translation", "Unicode", "timezone" |
| Observability     | "metric", "log", "trace", "alert", "dashboard" |

Each signal becomes a candidate NFR - but NOT every signal is testable
as authored. Run each through Step 2.

## Step 2 - Make every NFR threshold-bound

Per ISTQB testability ([istqb-testability]), an NFR is testable only when it
has:

[istqb-testability]: https://glossary.istqb.org/en_US/term/testability

1. A **threshold** (numeric or boolean).
2. A **measurement source** (which tool / metric provides the value).
3. A **scope** (which surface / user / scenario it applies to).

| Untestable NFR                                  | Threshold-bound rewrite                                                                  |
|--------------------------------------------------|------------------------------------------------------------------------------------------|
| "The site should be fast"                        | "p95 page-load time on `/dashboard` is ≤2.5s, measured by Lighthouse CI under 4G throttling." |
| "Accessible to screen reader users"               | "WCAG 2.2 AA conformance on `/checkout`; axe-core scan returns zero `serious` or `critical` violations." |
| "Secure against attacks"                          | "OWASP ASVS Level 2 controls 1-7; verified by `npm audit --audit-level=high` exit zero AND ZAP baseline scan zero alerts." |
| "Works on all browsers"                            | "Functional E2E tests pass on Chrome ≥120, Firefox ≥120, Safari ≥17 (latest two majors per WebRumStats data)." |
| "Highly available"                                 | "Uptime ≥99.9% measured monthly via external prober; recovery from any single-AZ failure ≤5 min." |

The agent **never** fabricates a threshold. If the doc says "fast"
without a number, the agent emits an explicit question ("What's the
target p95? Common defaults: 2.5s for landing, 1.5s for cached,
200ms for API."), it does not invent 2.5s.

## Step 3 - Map to canonical measurement sources

Each NFR must name **how** it's measured. Look up the canonical source for
its family in [references/measurement-sources.md](references/measurement-sources.md),
which catalogs sources for Performance (Web Vitals, k6), Accessibility
(WCAG 2.2, axe-core), Security (OWASP ASVS, ZAP), Compatibility (MDN,
Can I use), Reliability (Google SRE Workbook), and Internationalization
(W3C i18n, Unicode CLDR).

Load-bearing defaults - Web Vitals: **LCP ≤2.5s**, **INP ≤200ms**,
**CLS ≤0.1**. Per-criterion a11y citations use the WCAG SC ID format
(`WCAG 2.2 SC 1.4.3 Contrast (Minimum)`) so the test report
back-references the standard.

## Output format

```markdown
# NFRs extracted from `<doc-id>`

**Source doc:** `<path or URL>`
**Date extracted:** YYYY-MM-DD
**NFRs found:** N
**Threshold gaps flagged:** M

## Performance

| ID    | Requirement                                                | Threshold | Measurement | Scope                |
|-------|------------------------------------------------------------|-----------|-------------|----------------------|
| PRF-1 | LCP on /dashboard                                          | ≤2.5s     | Lighthouse CI; Web Vitals 75th-percentile field data | logged-in user, 4G, 1280x800 |
| PRF-2 | p95 latency on POST /api/orders                            | ≤200ms    | k6 load test, 50 RPS for 5 min | production-like staging |

## Accessibility

| ID    | Requirement                                                | Threshold        | Measurement | Scope            |
|-------|------------------------------------------------------------|------------------|-------------|------------------|
| A11Y-1| WCAG 2.2 AA conformance                                    | zero serious/critical violations | axe-core scan | every page in app sitemap |

## Security

| ID    | Requirement                                                | Threshold        | Measurement | Scope                  |
|-------|------------------------------------------------------------|------------------|-------------|------------------------|
| SEC-1 | No high-severity dependency vulnerabilities                | zero high/critical | npm audit --audit-level=high | every PR; production deps |
| SEC-2 | OWASP ASVS Level 2 baseline                                | pass              | ZAP baseline scan + manual ASVS checklist | release readiness gate |

## Compatibility / i18n / Reliability / Observability

(similar tables, only included when the source doc raised them)

## Threshold gaps (HUMAN INPUT REQUIRED)

| Vague phrase                       | Where in doc          | Suggested concretization                                       |
|------------------------------------|-----------------------|----------------------------------------------------------------|
| "fast checkout"                    | line 12               | LCP ≤1.5s (typical for cached transactional flow)?            |
| "supports global users"            | line 28               | Locale list? RTL support? Timezone handling? Unicode in fields? |

The agent does NOT pick the answers - author must confirm.
```

## Worked example

A team submits a checkout PRD. The skill runs it through two passes.

**Pass 1 - vague PRD.** Input:

> "Checkout must feel snappy and work for users worldwide. We need to
> meet enterprise security requirements."

Every phrase fails the Step 2 testability test, so nothing is emitted as
an NFR - each becomes a threshold-gap question:

```markdown
**NFRs found:** 0 (all phrases are vague)
**Threshold gaps flagged:** 3

| Vague phrase                              | Suggested concretization                                                                  |
|-------------------------------------------|-------------------------------------------------------------------------------------------|
| "feel snappy"                              | LCP ≤2.5s, INP ≤200ms (Web Vitals defaults)?                                            |
| "work for users worldwide"                 | Specify: which locales? RTL? timezones? Unicode validation? CLDR-based number/date formatting? |
| "enterprise security requirements"         | OWASP ASVS Level 2 (typical baseline) or Level 3 (strict)? SOC 2 Type II audit? FedRAMP? |
```

The output is a question list, not a fabricated set of thresholds.

**Pass 2 - author returns with concrete thresholds.** Input:

> "Page load on /dashboard must be ≤1.5s p95 measured by Lighthouse
> CI on the GitHub Actions ubuntu-latest runner. Color contrast ratio
> ≥4.5:1 for normal text per WCAG 2.2 SC 1.4.3."

Every phrase is now threshold-bound and measurement-cited, so the skill
emits tables with zero gaps:

```markdown
## Performance

| ID    | Requirement                                                | Threshold | Measurement | Scope          |
|-------|------------------------------------------------------------|-----------|-------------|----------------|
| PRF-1 | Page load on /dashboard                                    | ≤1.5s p95 | Lighthouse CI on GitHub Actions ubuntu-latest | /dashboard route |

## Accessibility

| ID    | Requirement                                                | Threshold | Measurement | Scope          |
|-------|------------------------------------------------------------|-----------|-------------|----------------|
| A11Y-1| Color contrast ratio for normal text                       | ≥4.5:1    | WCAG 2.2 SC 1.4.3 | every page |

**Threshold gaps:** 0 - all NFRs are threshold-bound and measurement-cited.
```

## Anti-patterns

| Anti-pattern                                        | Why it fails                                              | Fix |
|-----------------------------------------------------|-----------------------------------------------------------|-----|
| Inventing thresholds the doc didn't specify         | Tests pass for fabricated baselines; real users see worse perf. | Flag as threshold gap; require author input. |
| One generic "performance" NFR for every page        | Different surfaces have different budgets (cached vs non-cached). | One NFR per measurable scope (route × viewport × auth state). |
| Mapping every security NFR to "OWASP Top 10"        | Top 10 is awareness-tier; ASVS is verifiable. Compliance maps to ASVS. | Specify ASVS Level (1/2/3) and which controls. |
| Treating "uptime SLA" as a test requirement          | SLA is a runtime / monitoring concern, not a pre-deploy test. | Map to monitoring metric + alert rule, not to a CI gate. |

## References

- [istqb-nft][istqb-nft] - ISTQB Glossary: non-functional testing.
- [istqb-testability][istqb-testability] - testability heuristic
  underlying the threshold-bound rule.
- ISO/IEC 25010:2011 - eight product-quality characteristics. Cite by
  stable standard ID; spec is paywalled.
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- OWASP ASVS - https://owasp.org/www-project-application-security-verification-standard/
- Web Vitals - https://web.dev/articles/vitals (LCP / INP / CLS).
- `gherkin-from-stories` (qa-bdd plugin) - for **functional** requirements.
