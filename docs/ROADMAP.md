# Roadmap — gap analysis

This document inventories the QA disciplines and tools that **the
marketplace does not yet cover** (or covers thinly). It is the public
contribution map: pick a slot, run the [differentiation
requirement](CONTRIBUTING.md) against it, and open a plugin-request
issue or a PR.

It replaces the older "NOT-GAPS" exclusion list. The marketplace no
longer blocks categories by name. The gap analysis below is a *positive*
roadmap of what we want to land next.

> **Note (2026-06-10 refresh):** every plugin-sized gap from the previous
> revision of this document has shipped or been absorbed:
> `qa-test-management`, `qa-defect-management`, `qa-fuzz-testing`, and
> `qa-test-data-privacy` shipped as plugins; risk-based testing was
> absorbed into `qa-process` (the `risk-*` skill/agent family);
> exploratory testing was absorbed into `qa-manual-testing` (SBTM,
> charters, heuristics, tours); cross-browser grids were absorbed into
> `qa-web-e2e` (BrowserStack / Sauce Labs / LambdaTest / Selenium Grid)
> and `qa-compatibility` (matrix strategy). All nine former Tier-2 and
> all five former Tier-3 plugin gaps also shipped. The tables below are
> a fresh gap list derived from a June 2026 review of the catalog
> against ISTQB role definitions (CTFL v4.0, CTAL-TM v3.0, CTAL-TAE
> v2.0) and practitioner surveys.
> **`CATALOG.md` is the source of truth for what currently ships** —
> check it before picking a slot.

## How to use this document

- Each gap is sized as a **plugin** (new top-level `plugins/<name>/`)
  or an **extension** (skills / agents to add inside an existing
  plugin).
- Each gap lists the **canonical sources** an author would need to fetch
  to satisfy D6 — these are not exhaustive; they are the starting points.
- Each gap names the **closest existing components** so contributors can
  state their differentiation axis in the PR.
- Tiers reflect priority for testland-qa, not absolute importance in the
  QA industry. T1 = high-frequency disciplines real teams use daily that
  the marketplace lacks. T2 = common, narrower gaps. T3 = niche or
  polish-level gaps open to differentiated contributions.

## Current coverage snapshot

The catalog ships **89 plugins / 706 components** across ten categories
(foundations, functional testing, quality engineering, security &
compliance, operations & resilience, backend & distributed systems,
integrations & protocols, AI & ML, tooling, and role bundles). The role
bundles cover both axes: technology domains (frontend, backend,
mobile-desktop, security, performance, ai) and career roles
(manual-tester, automation-engineer, sdet, leadership, starter).

See [`CATALOG.md`](../CATALOG.md) for the authoritative list.

## Tier 1 — High-frequency gaps

Widely practised in real QA teams, expected by ISTQB-aligned managers
or visible in practitioner surveys, and absent from the catalog.

### Headcount and budget planning (extension: `qa-team-management`)

**Why missing matters:** `qa-team-management` now covers skill matrices,
career ladders, 1:1s, feedback, and exec narratives, but a QA manager's
resourcing work — headcount-vs-roadmap modeling, budget lines for tools
and device clouds, build-vs-buy framing — still has no component.
`qa-vendor-evaluator` (in `qa-process`) covers single-procurement
decisions only.

**Nearest existing components:** `qa-vendor-evaluator`,
`test-effort-estimator` (qa-roles), `team-capability-gap-analyst`.

**Differentiation axis:** effort estimation is per-epic;
capability-gap analysis is per-skill; this is annual/quarterly
resource planning across a team or org.

**Suggested components:** skill `headcount-and-budget-planner`.

**Canonical sources to fetch:** ISTQB CTAL-TM v3.0 (estimation
chapters), Capgemini World Quality Report (team-structure data).

### DORA metrics computation (extension: `qa-test-reporting`)

**Why missing matters:** the `qa-manager` and `head-of-quality` agents
(qa-roles) consume DORA metrics as context but nothing in the catalog
*computes* deployment frequency, change failure rate, lead time, or
MTTR from repo + CI history. Quality leadership reporting stops at
whatever numbers the team already has.

**Nearest existing components:** `qa-manager`, `head-of-quality`,
`daily-test-suite-aggregator`.

**Differentiation axis:** the existing agents aggregate and narrate
already-computed signals; this computes the four keys from raw git/CI
data.

**Suggested components:** skill `dora-metrics-computer` (git log + CI
API + incident records in, four keys out), plus the long-suggested
`quality-metrics-dora-space-reference`.

**Canonical sources to fetch:** dora.dev (metric definitions and the
five-metric evolution), SPACE framework paper (ACM Queue).

### Manual cross-browser / device spot-check workflow (extension: `qa-compatibility`)

**Why missing matters:** the grid skills (`browserstack-automate`,
`saucelabs-automate`, `lambdatest-automate`, `selenium-grid-4-runner`)
and `browser-matrix-runner` are automation-oriented. A manual tester
doing a responsive pass or a per-release browser/device spot check has
no checklist-shaped workflow.

**Nearest existing components:** `browser-matrix-strategy-reference`,
`compatibility-budget`, `test-execution-checklist` (qa-manual-testing).

**Differentiation axis:** matrix strategy decides *what* to cover;
this produces the human-executable spot-check run for a release.

**Suggested components:** skill `manual-compat-spot-check-author`
(tiered browser/device checklist + responsive breakpoints + recording
template).

**Canonical sources to fetch:** BrowserStack Live docs, MDN responsive
design docs, statcounter browser-share data.

### Manual-tester test data preparation (extension: `qa-test-data`)

**Why missing matters:** every generator in `qa-test-data` is
code-based (Faker / FactoryBot / mimesis / Bogus). A manual tester who
needs 20 test accounts, a populated demo org, or a data reset between
test cycles gets no workflow that doesn't assume programming.

**Nearest existing components:** `seed-data-curator`,
`test-data-setup-agent`, `synthetic-data-toolkit`.

**Differentiation axis:** existing components generate data *in code*
for automated suites; this covers UI/API-driven preparation an analyst
can execute, plus reset-between-cycles discipline.

**Suggested components:** skill `manual-test-data-prep` (account/org
setup recipes, import-file generation, reset checklists).

**Canonical sources to fetch:** the data-generation tool docs already
cited by the sibling skills; ISO/IEC/IEEE 29119-3 (test data in test
documentation).

### Requirements / acceptance-criteria ambiguity review (extension: `qa-manual-testing` or `qa-shift-left`)

**Why missing matters:** raising ambiguities in requirements before
build is a daily manual-tester activity (ISTQB CTFL v4.0 static
testing), but the catalog only touches it indirectly:
`acceptance-criteria-extractor` converts a story into AC, and
`test-case-ideation-from-story` designs cases from one — neither
*reviews* requirements for testability-blocking ambiguity.

**Nearest existing components:** `acceptance-criteria-extractor`,
`testability-reviewer`, `test-case-ideation-from-story`.

**Differentiation axis:** extraction converts; testability review
targets the *design*; this critiques the *requirement text* (vague
quantifiers, missing negative paths, undefined states) before any
test design happens.

**Suggested components:** agent `requirement-ambiguity-critic`.

**Canonical sources to fetch:** ISTQB CTFL v4.0 §3 (static testing,
review types), INVEST criteria (original Wake article), ISO/IEC/IEEE
29148 (requirements engineering).

### Design-for-testability remediation patterns (extension: `qa-shift-left`)

**Why missing matters:** `testability-reviewer` flags
Observable/Decidable/Bounded failures and `tdd-stuck-pattern-resolver`
names blockers (singletons, statics), but nothing teaches the
remediation patterns — dependency injection, seams, ports-and-adapters
boundaries, observability hooks for tests.

**Nearest existing components:** `testability-reviewer`,
`tdd-stuck-pattern-resolver`, `observability-to-test`.

**Differentiation axis:** the reviewer finds the problem; this is the
pattern catalog for fixing it.

**Suggested components:** skill `testability-remediation-patterns`.

**Canonical sources to fetch:** Michael Feathers, *Working Effectively
with Legacy Code* (ISBN 978-0131177055) for seams; framework DI docs.

## Tier 2 — Common gaps

### Framework migration toolkits (extensions: `qa-web-e2e`, `qa-unit-tests-js`)

Selenium → Playwright and Mocha/Jest → Vitest migrations are common
modernization projects with no step-by-step toolkit in the catalog
(only SpecFlow → Reqnroll is documented, in `qa-bdd`). Suggested:
`selenium-to-playwright-migrator`, `jest-to-vitest-migrator`.
Nearest: the per-framework skills themselves; `test-framework-blueprint`
(green-field design, not migration). Sources: playwright.dev migration
guides, vitest.dev migration guide.

### Test process maturity assessment (extension: `qa-process` or `qa-team-management`)

TMMi-style maturity benchmarking (where is this QA org, what's the
improvement roadmap) has no component. Nearest: `test-strategy-author`,
`qa-okr-author`, `post-mortem-author`. Sources: tmmi.org framework
documents (TMMi specification is freely downloadable).

### QA org-topology decision support (extension: `qa-team-management`)

Embedded vs centralized QA, squad assignment, reporting lines — a
head-of-quality decision with no component.
Nearest: `head-of-quality` (reads embedded-vs-silo staffing as input),
`career-ladder-author`. Sources: Skelton & Pais, *Team Topologies*
(ISBN 978-1942788812); DevOps Topologies patterns (web.devopstopologies.com).

### Defect-triage meeting orchestration (extension: `qa-defect-management`)

The critics (`bug-report-critic`, `duplicate-defect-finder`) audit
single reports; nothing runs the recurring triage ritual end to end
(queue ordering, severity calibration, decision recording). Suggested:
agent `triage-meeting-runner`. Sources: ISTQB CTAL-TM defect
management sections; tracker workflow docs already cited in-plugin.

### Stateful-service sharding patterns (extension: `qa-ci-integration`)

`ci-test-job-conventions` covers when to shard; nothing covers
isolation design for stateful systems under parallelism
(user-per-shard, schema-per-worker, data partitioning). Suggested:
`stateful-shard-isolation-reference`. Nearest:
`parallel-isolation-checker` (detects collisions after the fact;
this designs them away). Sources: Playwright/Cypress parallelism docs,
testcontainers isolation docs.

### Mass test-code refactoring support (extension: `qa-test-review`)

Bulk selector updates and page-object extraction across a large suite
have no component — `e2e-selector-quality-critic` flags one file at a
time. Suggested: agent `selector-mass-refactorer`. Sources:
playwright.dev locators docs, testing-library query priority docs.

## Tier 3 — Niche and polish

- **Org-chart seats (`qa-roles`):** a Tier-1 agent for *scripted*
  manual execution (companion to `exploratory-charter-author`;
  guides a human through a `test-execution-checklist` run and records
  results), plus the previously-suggested
  `engineering-manager-quality-coach` and
  `release-manager-cutover-checklist` (note:
  `release-cutover-coordinator` partially covers the latter).
- **Load-generator wrappers (`qa-load-testing`):** `vegeta-load`,
  `wrk2-load`, `bombardier-load`, `artillery-load` — per-tool skills
  alongside the shipped k6/JMeter/Gatling/Locust set.
- **CI providers (`qa-ci-integration`):** `buildkite-test-author`,
  `azure-pipelines-test-author`.
- **Advanced mocking (`qa-test-data`):** WireMock stateful scenarios +
  JSONPath/array matchers beyond what `wiremock-stubs` covers
  (wiremock.org docs); Mountebank record-playback.

### Differentiated generic categories

These were excluded as "saturated" cells. They are open again if a
contribution adds a documented differentiation axis vs. the existing
ecosystem clones.

- **code-reviewer** family — *open* iff scoped to a specific
  language / framework / change class (e.g., "Reviews React PRs for
  hook-rule violations", not "reviews code").
- **security-auditor** / OWASP-Top-10 wrappers — *open* iff scoped to
  a specific OWASP category (e.g., "Audits a PR for A03-2021 Injection
  patterns").
- **debugger** family — *open* iff scoped to a specific runtime /
  failure class (e.g., "Reproduces a hung Node.js process from a heap
  dump", not "debug things").
- **test-automator** family — *open* iff scoped to a specific
  conversion target (e.g., "Converts manual Postman runs into k6
  scripts", not "automates tests").
- **generic security tool wrappers** (zap, burp, snyk, trivy,
  semgrep, gitleaks) — atomic skills under the relevant security
  plugin (`qa-dast` / `qa-sca` / `qa-secrets`) are admissible if they
  cover a specific workflow the existing skills don't.
- **WCAG umbrella skills** — atomic accessibility skills (keyboard,
  focus-trap, colour-contrast, ARIA-roles, axe-rules) are admissible
  under `qa-accessibility`. "Audit my app for WCAG" as a
  single skill is still bad scope but no longer name-blocked.

## Within-plugin extensions

Skills and agents that would deepen existing plugins without warranting
a new top-level plugin. Pruned 2026-06-10 against the shipped catalog;
listed in plugin order.

### qa-test-data

- `factory-boy-django` — Django factory pattern (sibling of shipped
  factory-bot-data / bogus-data / mimesis-data).
- `synthetic-event-stream-builder` — generate Kafka / Kinesis
  test streams.

### qa-test-environment

- `devcontainers-test-env` — VS Code devcontainer.json for QA-ready environments.
- `nix-shell-test-env` — reproducible test environments via Nix.

### qa-test-reporting

- `xunit-net-reporter` — xUnit.net reporter integration.
- `allure-3-reporter` — Allure 3 if/when it ships.

### qa-test-impact-analysis

- `nx-affected-test-runner` — Nx monorepo affected-test selection.
- `bazel-test-affected-selection` — Bazel `--affected` selection.

### qa-test-review

- `review-comment-conventions-reference` — review comment
  taxonomy (blocking / non-blocking / nit / question / praise).
- `pr-test-coverage-critic` — agent that rejects PRs lacking
  meaningful new test coverage on changed code paths.

### qa-api-testing

- `oas-spec-validation` — OpenAPI spec lint + validate.
- `prism-mock-server` — OpenAPI mock from spec.
- `mockoon-builder` — local mock GUI / CLI.
- `dredd-contract-runner` — Dredd API/spec testing.

### qa-bdd

- `cucumber-rules-runner` — Rules-style Gherkin (Cucumber 7+).
- `gauge-framework` — Gauge as Cucumber alternative.

### qa-contract-testing

- `pact-broker-self-hosting` — Pact Broker setup.
- `pactflow-integration` — managed Pact (Pactflow).
- `spring-cloud-contract` — JVM contract testing.

### qa-mobile

- `firebase-test-lab-runner` — Firebase Test Lab device farm.

### qa-mutation-testing

- `infection-php` — Infection for PHP.

### qa-property-based

- `gopter-go` — gopter for Go.

### qa-web-e2e

- `playwright-component-testing` — Playwright component-test mode.

### qa-visual-regression

- `loki-storybook` — Loki visual diff for Storybook.

### qa-localization

- `icu-messageformat-validator` — ICU MessageFormat plural/select validation.

### qa-dast

- `caido-proxy` — Caido as Burp Suite alternative.

### qa-secrets

- `detect-secrets-yelp` — Yelp detect-secrets.

### qa-flake-triage

- `flake-bug-template-author` — file a flake bug with classification.

## How to contribute against this roadmap

1. **Pick a gap.** Higher tier = more urgent, but lower-tier
   contributions are welcome.
2. **Read the differentiation requirement** in
   [`CONTRIBUTING.md`](CONTRIBUTING.md). Identify your 2–3 nearest
   neighbours in the catalog (or the broader ecosystem) and write down
   your differentiation axis.
3. **Open a plugin-request or component-request issue** so we can
   coordinate scope before you write the body. Use the template at
   `.github/ISSUE_TEMPLATE/plugin-request.md`.
4. **Scaffold + author.** Follow [`PLUGIN_AUTHORING.md`](PLUGIN_AUTHORING.md)
   for the per-step workflow.
5. **Self-check against D1–D6.** Total ≥ 21, D6 ≥ 1 (a pre-PR sanity check
   against the rubric — the score is not stored or CI-enforced).
6. **PR.** Use `.github/pull_request_template.md`.

If you think a gap is missing from this document, open an issue with
your nearest-neighbour analysis and we'll add it.
