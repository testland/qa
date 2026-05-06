---
name: sonarqube-rules
description: Configures and runs SonarQube / SonarCloud — multi-language SAST + Quality Gate platform with built-in Sonar Way rule profiles + custom rule plugins; integrates `sonar-scanner` with `sonar-project.properties` config; supports Quality Gate definitions including new-code-period blocking, branch + PR analysis, and per-issue suppression via `// NOSONAR` comment or `@SuppressWarnings("squid:RULE_ID")` annotation. Use when the user runs SonarQube Community / Developer / Enterprise edition or SonarCloud, or needs a multi-language SAST + code-quality platform with persistent issue tracking.
rating: 22
d6: 4
archetype: S1
---

# sonarqube-rules

## Overview

Per [github.com/SonarSource/sonarqube][sq-gh]:

[sq-gh]: https://github.com/SonarSource/sonarqube

> "SonarQube provides the capability to not only show the health
> of an application but also to highlight issues newly introduced."

The platform's distinguishing features vs Semgrep / CodeQL:

- **Quality Gate** — pass/fail decision based on configurable
  threshold conditions (coverage on new code, duplication, security
  hotspots reviewed, maintainability rating, etc.).
- **New-code-period** — issues are categorized as "new code" vs
  "overall code"; gates focus on new-code metrics so legacy debt
  doesn't block deploys.
- **Persistent issue tracking** — server-side storage of issues
  across scans; status workflow (open / confirmed / resolved / false
  positive / won't fix).
- **Cross-language coverage** — 30+ languages with one tool +
  unified UI.

## When to use

- Existing SonarQube deployment (Community / Developer / Enterprise
  / SonarCloud).
- The team needs persistent issue tracking + Quality Gate workflow.
- Multi-language coverage in one platform is a requirement.
- New-code-period gating fits the team's deploy cadence.

For new projects without a SonarQube investment, evaluate
[`semgrep-rules`](../semgrep-rules/SKILL.md) (lower friction; no
server) first.

## Step 1 — Install (server side)

Per [docs.sonarsource.com/sonarqube-server][sq-docs]:

[sq-docs]: https://docs.sonarsource.com/sonarqube-server/latest/

Docker (most common for evaluation):

```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  sonarqube:lts-community
```

For production, consult [sq-docs][sq-docs] for Postgres + JVM
sizing + reverse-proxy configuration. Default admin: `admin` /
`admin` (change immediately).

## Step 2 — sonar-scanner CLI

Download from [docs.sonarsource.com/sonarqube-server][sq-docs] →
"Analysis scanners". Place on PATH.

```bash
sonar-scanner \
  -Dsonar.projectKey=my-project \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=$SONAR_TOKEN
```

For Maven / Gradle / .NET, use the language-native scanner plugin
(`mvn sonar:sonar` / `./gradlew sonar` / `dotnet sonarscanner`).

## Step 3 — `sonar-project.properties` config

Project-root file replaces `-D` flags:

```properties
# sonar-project.properties
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/*.spec.ts,**/generated/**
sonar.sourceEncoding=UTF-8

# Coverage from external tool (Jest, JaCoCo, etc.)
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# New-code-period (analysis scope)
sonar.newCode.referenceBranch=main

# Quality Gate (referenced by ID; created via UI/API)
sonar.qualitygate.wait=true
```

`sonar.qualitygate.wait=true` makes the scanner block until the
gate decision is computed — critical for CI gating.

## Step 4 — Quality Gate concept

The default "Sonar Way" gate enforces (consult your SonarQube UI
at `Quality Gates → Sonar Way` for current conditions):

- Coverage on New Code ≥ X%
- Duplicated Lines on New Code ≤ Y%
- Maintainability Rating on New Code = A
- Reliability Rating on New Code = A
- Security Rating on New Code = A
- Security Hotspots on New Code reviewed = 100%

Custom gates can be defined via UI or REST API
(`/api/qualitygates/create`).

## Step 5 — Branch + PR analysis

For PR analysis (Developer edition+):

```bash
sonar-scanner \
  -Dsonar.pullrequest.key=$PR_NUMBER \
  -Dsonar.pullrequest.branch=$PR_BRANCH \
  -Dsonar.pullrequest.base=main
```

PR results post as comments to GitHub / GitLab / Bitbucket per
the integration setup in SonarQube admin.

## Step 6 — False-positive triage (MANDATORY)

Three suppression layers in priority order:

| Mechanism | Example | When to use |
|---|---|---|
| Per-line `NOSONAR` | `int x = 0; // NOSONAR justification text` | Single-line exception with inline reason |
| Annotation | `@SuppressWarnings("squid:S106")` | Java/Kotlin per-block exception |
| Server-side mark-as-FP | UI: Issues → Resolve as False Positive | Persistent across scans; auditable |
| Server-side mark-as-Won't Fix | UI: Issues → Resolve as Won't Fix | Acknowledged risk; not a defect |

**Justification template (mandatory in code):**

```java
// NOSONAR squid:S106 - Reason: required for CLI tool stdout output
// Reviewer: alice@example.com (2026-05-15)
// Expires: 2026-12-15
System.out.println(message);
```

Server-side resolution requires a comment per SonarQube workflow
config — make it mandatory in admin settings (`Administration →
Configuration → Issues → Comment required to set status`).

Cadence: `Issues → False Positive` filter periodically; review for
expiration. Server-side resolutions are persistent and auditable —
the audit trail is the value over Semgrep's per-comment approach.

## Step 7 — CI integration

```yaml
jobs:
  sonarqube:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }   # full history needed for new-code-period
      - uses: SonarSource/sonarqube-scan-action@v5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
      - uses: SonarSource/sonarqube-quality-gate-action@v1
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

`fetch-depth: 0` is critical — without full git history, new-code-period
detection is broken.

## Step 8 — REST API integration

For automation / dashboards:

| Endpoint | Use |
|---|---|
| `GET /api/issues/search?projectKeys=...` | Issue list with filters |
| `GET /api/qualitygates/project_status` | Current gate verdict |
| `POST /api/issues/do_transition` | Mark FP / Won't Fix |
| `GET /api/measures/component_tree` | Per-file metrics |

API token via `User → My Account → Security → Generate Tokens`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `fetch-depth: 1` in CI | New-code-period broken; gates produce wrong decisions | Always `fetch-depth: 0` (Step 7) |
| Skip `sonar.qualitygate.wait` | CI exits before gate evaluates; missed regressions | `sonar.qualitygate.wait=true` (Step 3) |
| NOSONAR without justification | Server-side audit trail empty | Required template (Step 6) |
| Custom Quality Gate without team buy-in | Gate fails on PRs no one understands | Document gate definition; reference in PR template |
| Mass-resolve as FP without review | Backdoor for skipping security findings | Require comment + reviewer attribution (Step 6) |

## Limitations

- SonarQube server requires hosting + maintenance; SonarCloud is
  the SaaS alternative.
- Branch + PR analysis are Developer-edition+ features — Community
  edition only supports main branch.
- Some language-specific deep-rule features require Developer or
  Enterprise edition.
- New-code-period requires accurate git history; shallow clones
  break it.
- License changed from LGPL to SSPL in 2024 — verify license
  compatibility for commercial use.

## References

- [sq-gh][sq-gh] — repository
- [sq-docs][sq-docs] — official SonarQube documentation root
- docs.sonarsource.com/sonarqube-server/latest/user-guide/quality-gates
  — Quality Gates user guide
- docs.sonarsource.com/sonarqube-server/latest/user-guide/issues
  — Issue workflow + transitions
- [`semgrep-rules`](../semgrep-rules/SKILL.md),
  [`codeql-queries`](../codeql-queries/SKILL.md),
  [`bandit-python`](../bandit-python/SKILL.md),
  [`gosec-go`](../gosec-go/SKILL.md) — sister scanners
- [`sast-finding-triager`](../../agents/sast-finding-triager.md) —
  unifier agent
