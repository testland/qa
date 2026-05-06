---
name: sonarqube-quality-perspective
description: Run SonarQube/SonarCloud against production code to surface Code Smells, Bugs, and Maintainability ratings — the quality lens (cross-ref qa-sast for the Vulnerability/Hotspot lens). Production-only scope via sonar.exclusions; test code is owned by qa-test-review.
type: skill
archetype: S1
rating: 23
d6: 4
keywords:
  - sonarqube
  - sonarcloud
  - code-smell
  - maintainability
  - quality-gate
---

# sonarqube-quality-perspective

SonarQube classifies issues across three software qualities — **Reliability,
Maintainability, Security** — and four Clean Code attributes
(*Consistent, Intentional, Adaptable, Responsible*) per the SonarSource
docs (see [Issues introduction]). qa-sast's `sonarqube-rules` skill
covers the Security lens; this skill covers the **Reliability +
Maintainability** lens for production code.

## When to use

- A pull request touches production code and you want
  Bug/Code-Smell metrics scoped to the diff (not test files).
- Pre-merge Quality Gate enforcement on the Sonar Way default
  (no new issues; new-code coverage ≥80%; new-code duplication ≤3%
  — per [Sonar Way QG]).
- Legacy codebase entering Sonar adoption — focus on **new code only**
  to avoid baseline-debt theater.

## Step 1 — Install scanner

| Stack | Scanner |
|---|---|
| Maven | `sonar-maven-plugin` (`mvn sonar:sonar`) |
| Gradle | `org.sonarqube` plugin (`./gradlew sonar`) |
| .NET | `dotnet-sonarscanner` |
| Anything else | `sonar-scanner` CLI |

See the [SonarQube docs sitemap] for per-build-tool installation.

## Step 2 — Scope to production code

Add to `sonar-project.properties`:

```properties
sonar.projectKey=acme.platform
sonar.sources=src
sonar.tests=tests,src/**/*.test.ts
sonar.exclusions=**/*.generated.*,**/migrations/**,**/vendor/**
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts,tests/**
sonar.coverage.exclusions=**/*.generated.*,**/main.ts
```

**Why separate `sonar.tests` vs `sonar.sources`:** test code has different
quality expectations (long names, deliberate duplication for clarity,
Arrange-Act-Assert patterns). Lumping them into one scope produces
noise. Test code is reviewed by `qa-test-review` skills/agents
instead.

## Step 3 — Run scan

```bash
# Local development scan against a SonarQube server
sonar-scanner \
  -Dsonar.host.url=https://sonar.internal \
  -Dsonar.token=$SONAR_TOKEN

# CI scan with PR analysis (branch + PR decoration)
sonar-scanner \
  -Dsonar.pullrequest.key=$PR_NUMBER \
  -Dsonar.pullrequest.branch=$PR_BRANCH \
  -Dsonar.pullrequest.base=main
```

The scanner uploads to the configured server; results stream to the
project dashboard.

## Step 4 — Read the dashboard

| Metric | What it means | Sonar Way default |
|---|---|---|
| New Bugs | Reliability issues introduced in PR | 0 |
| New Code Smells | Maintainability issues introduced in PR | 0 |
| New Coverage | % new lines covered by tests | ≥ 80% |
| New Duplication | % new lines duplicated | ≤ 3% |
| Maintainability Rating (new code) | A–E based on debt ratio | A |
| Reliability Rating (new code) | A–E based on bug density | A |

Per [Sonar Way QG]: any condition fail blocks merge.

## Step 5 — Quality Gate as CI gate

```yaml
# GitHub Actions
- name: SonarQube Scan
  uses: SonarSource/sonarqube-scan-action@v3
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
- name: SonarQube Quality Gate Check
  uses: SonarSource/sonarqube-quality-gate-action@v1
  timeout-minutes: 5
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

The `quality-gate-action` polls the server until the gate result lands
and fails the build if it's RED.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Scan whole repo without `sonar.tests` separation | Test conventions flagged as smells; team disables Sonar | Split `sonar.sources` / `sonar.tests` (Step 2) |
| Apply gate to overall code, not new code | Legacy debt blocks all PRs forever | Use new-code-period gate (Sonar Way default) |
| Mix this with qa-sast's `sonarqube-rules` settings | Two skills mutating same `sonar-project.properties` | This skill owns Reliability+Maintainability; qa-sast/sonarqube-rules owns Security profile |
| Lower gate to merge pre-existing failures | Gate becomes meaningless | Use "Wont Fix" / "Accepted" issue resolution + scope-exclusion comment instead |
| Run after merge only | No PR decoration; hard to review | Run on PR with `sonar.pullrequest.*` flags (Step 3) |

## Limitations

- Sonar Way thresholds are tuned for greenfield + healthy codebases.
  Brownfield rollout: keep gate but mark all pre-existing as "Accepted"
  with re-review date + waiver template (`Reason:` + `Approved-by:` +
  `Re-review-date:` + `expires:`).
- Self-hosted SonarQube (Community) does not include MQR severity
  granularity; SonarCloud + Enterprise do.

## References

- [Issues introduction] — Clean Code attributes, software qualities,
  Sonar Way Quality Gate defaults
- [SonarQube docs sitemap] — per-build-tool scanner setup, current
  config options

[Issues introduction]: https://docs.sonarsource.com/sonarqube-server/user-guide/issues/introduction.md
[Sonar Way QG]: https://docs.sonarsource.com/sonarqube-server/user-guide/issues/introduction.md
[SonarQube docs sitemap]: https://docs.sonarsource.com/sitemap.md
