# Core catalog

The curated tier of the marketplace: the components with the highest real-world
demand and the most lift over what a strong model does unaided. Everything else
in [`CATALOG.md`](CATALOG.md) is the extended tier — still reviewed, still
maintained, still installable; this page is where a new user should start.

**94 core skills · 25 core agents** (of 340 skills / 73 agents total).

## Core skills

### Process & team (qa-process, qa-team-management)

`test-case-ideation-from-story` · `test-strategy-author` · `risk-matrix` ·
`smoke-suite-gate` · `post-mortem-author` · `test-pyramid-balancer` ·
`framework-choice-advisor` · `e2e-suite-budget` · `quality-status-digest`

### Test data, reporting, review, environment (qa-test-data, qa-test-reporting, qa-test-review, qa-test-environment)

`faker-data` · `msw-handlers` · `negative-test-generator` ·
`boundary-value-generator` · `junit-xml-analysis` · `test-run-summary-author` ·
`test-code-conventions` · `test-isolation-patterns` · `test-framework-blueprint` ·
`testcontainers`

### Web, mobile, desktop, BDD, API (qa-web-e2e, qa-mobile, qa-desktop, qa-bdd, qa-api-testing)

`playwright-testing` · `cypress-testing` · `selenium-testing` ·
`appium-testing` · `xcuitest-suite` · `espresso-suite` · `detox-testing` ·
`electron-playwright` · `cucumber-testing` · `postman-collections` ·
`restassured-testing` · `schemathesis-fuzzing`

### Unit, mutation, property, contract (qa-unit-tests-*, qa-mutation-testing, qa-property-based, qa-contract-testing)

`js-unit-tests` · `pytest-asyncio-patterns` · `stryker-mutation` ·
`pitest-mutation` · `mutant-survival-triage` · `hypothesis-testing` ·
`fast-check-testing` · `pact-contract-testing` · `openapi-contract-diff`

### Accessibility, visual, data quality, localization (qa-accessibility, qa-visual-regression, qa-data-quality, qa-localization)

`axe-a11y` · `wcag-keyboard-navigation` · `aria-authoring-patterns` ·
`a11y-violation-gate` · `playwright-snapshots` ·
`chromatic-visual-regression-testing` · `dbt-testing` ·
`pseudo-localization-runner`

### Security & compliance (qa-security-scanning, qa-compliance, qa-multi-tenancy)

`semgrep-rules` · `multi-tool-finding-triage` · `zap-baseline` ·
`dependabot-config` · `gitleaks-scanning` · `trivy-image` ·
`gdpr-test-patterns` · `cross-tenant-data-leak-tests`

### Operations (qa-load-testing, qa-defect-management, qa-bug-repro, qa-flake-triage, qa-shift-left)

`k6-load-testing` · `jmeter-load-testing` · `lighthouse-perf` ·
`load-testing-overview` · `bug-tracker-workflow` ·
`confirmation-testing-workflow` · `bug-report-template` · `ci-failure-triage` ·
`flake-pattern-reference` · `flaky-test-quarantine` ·
`spec-testability-heuristics`

### Backend & distributed (qa-time, qa-cache-testing, qa-async-jobs, qa-concurrency, qa-distributed-tracing)

`dst-transition-reference` · `cache-key-discriminator-audit` ·
`cron-job-test-author` · `idempotency-test-author` ·
`race-condition-test-author` · `opentelemetry-trace-assertions`

### Integrations & protocols (qa-payment, qa-auth-flows, qa-realtime-protocols, qa-notifications, qa-graphql, qa-feature-flags)

`stripe-test-cards-and-webhooks` · `oauth-flow-test-author` ·
`session-management-test-author` · `keycloak-tests` · `websocket-tests` ·
`mailpit-testing` · `webhook-delivery-tester` · `apollo-server-tests` ·
`launchdarkly-testing`

### AI & ML (qa-llm-evaluation, qa-ml-models, qa-search-relevance)

`promptfoo-evaluation` · `deepeval-evaluation` · `ragas-evaluation` ·
`llm-regression-suite-author` · `llm-eval-anti-patterns` ·
`evidently-monitoring` · `vector-search-recall-tests`

### Manual testing & CI (qa-manual-testing, qa-ci-integration)

`manual-test-script-author` · `decision-table-test-design` ·
`state-transition-test-design` · `exploratory-testing` ·
`github-actions-test-jobs`

## Core agents

| Agent | Plugin | What it does |
|---|---|---|
| `e2e-flake-bisector` | qa-flake-triage | Multi-run flake bisection with isolation checking |
| `regression-bisector` | qa-flake-triage | git-bisect orchestration, pass/fail + perf modes |
| `ci-defect-filer` | qa-defect-management | Failure → dedupe → filed bug, end to end |
| `bug-repro-builder` | qa-bug-repro | Bug report → minimal failing test |
| `bug-report-from-recording` | qa-bug-repro | Playwright trace → filed-quality bug report |
| `test-code-critic` | qa-test-review | Every-PR test review: structure, assertions, mocking |
| `test-script-quality-critic` | qa-manual-testing | Adversarial gate on manual test scripts |
| `gherkin-style-reviewer` | qa-bdd | PR-time Gherkin style review |
| `playwright-codegen-reviewer` | qa-web-e2e | Codegen/Studio recordings → idiomatic tests |
| `automation-harness-bootstrapper` | qa-web-e2e | Start test automation from zero: writes the harness |
| `accessibility-code-critic` | qa-accessibility | PR-time WCAG source review |
| `visual-diff-classifier` | qa-visual-regression | Intentional / incidental / regression diff triage |
| `security-finding-triager` | qa-security-scanning | Cross-domain scanner-finding triage and gating |
| `tenant-leak-critic` | qa-multi-tenancy | Adversarial tenant-isolation PR review |
| `token-storage-security-critic` | qa-auth-flows | Token/cookie anti-pattern scan |
| `payment-flow-critic` | qa-payment | Idempotency / PAN-leak / 3DS-state review |
| `time-handling-critic` | qa-time | Time-handling anti-pattern scan with severity bands |
| `migration-blast-radius-reviewer` | qa-db-migrations | Schema-migration blast-radius + performance review |
| `ci-pipeline-health-critic` | qa-ci-integration | CI test-pipeline anti-pattern review |
| `vacuous-property-critic` | qa-property-based | Catches green-but-vacuous property tests |
| `contract-drift-investigator` | qa-contract-testing | On-call contract-drift categorize-and-route |
| `ai-test-curator` | qa-ai-assisted | The gate for AI-written tests |
| `prompt-eval-reviewer` | qa-llm-evaluation | LLM-eval methodology review with refuse rules |
| `release-readiness-checker` | qa-process | Configurable release-gate executor |
| `release-quality-report-agent` | qa-test-reporting | Per-release go/no-go evidence report |

(regression-bisector joins the original core set — its perf-measurement mode
absorbed a second agent during consolidation.)

## How this tier is maintained

Membership follows demand and lift, reassessed when the catalog is re-audited.
A component enters core by displacing one, not by growing the list; the
extended tier is the proving ground.
