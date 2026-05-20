# Roadmap — gap analysis

This document inventories the QA disciplines and tools that **the
marketplace does not yet cover** (or covers thinly). It is the public
contribution map: pick a slot, run the [differentiation
requirement](CONTRIBUTING.md) against it, and open a plugin-request
issue or a PR.

It replaces the older "NOT-GAPS" exclusion list. The marketplace no
longer blocks categories by name. The gap analysis below is a *positive*
roadmap of what we want to land next.

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
  the marketplace lacks. T2 = common, narrower gaps. T3 = previously
  excluded specialised domains now open to differentiated contributions.

## Current coverage snapshot

As of marketplace v4.0.0 the catalog ships 59 plugins / ~383 components
across seven groupings: **foundations** (process / environment / data /
reporting / impact / roles / review), **functional testing** (API / BDD
/ E2E / mobile / contract / mutation / property-based / 5 per-language
unit-test plugins), **quality engineering** (data quality / visual
regression / accessibility / localization / charts / PDF / modern web),
**security & compliance** (SAST / DAST / SCA / secrets / SBOM /
compliance), **operations & resilience** (flake triage / bug repro /
chaos / resilience drills / shift-left/right / load), **AI & specialised**
(LLM eval / ML models / AI-assisted / notebooks / distributed tracing /
realtime protocols / search / saga-CQRS / concurrency / DB migrations /
async jobs / auth flows / notifications), and **tooling** (IaC / CI
integration / CLI tools / code quality / compatibility / manual testing).

See [`CATALOG.md`](../CATALOG.md) for the authoritative list.

## Tier 1 — High-frequency disciplines genuinely missing

These are widely practised in real QA teams, expected by ISTQB-aligned
test managers, and absent from the catalog.

### qa-test-management (new plugin)

**Why missing matters:** test case management is where real QA teams
spend most of their non-execution time. Without coverage of TestRail,
Xray, Zephyr, or Allure TestOps, the catalog has no story for
traceability, test repository management, or coverage reporting against
requirements.

**Nearest existing components:** `qa-test-reporting`,
`qa-test-impact-analysis`, `qa-process`.

**Differentiation axis:** test-reporting is about *executed* results;
this is about the *test repository* (cases, suites, runs,
traceability) before and after execution.

**Suggested components:**

| Type | Name | Archetype | Purpose |
|---|---|---|---|
| skill | testrail-integration | S1 | Author cases, run sets, post results via TestRail API |
| skill | xray-jira-integration | S1 | Cases-as-Jira-issues, executions, requirements traceability |
| skill | zephyr-scale-integration | S1 | Native Jira test repository (Zephyr Scale) |
| skill | allure-testops-integration | S1 | Allure TestOps cases + runs |
| skill | testlink-runner | S1 | Open-source test case management |
| skill | qase-io-runner | S1 | Modern hosted TCM |
| skill | traceability-matrix-builder | S3 | Build a requirements-to-tests matrix |
| skill | test-case-anatomy-reference | S2 | Pre/steps/expected/post structure, parametric cases |
| agent | test-case-quality-critic | A3 | Reject vague steps, missing preconditions, ambiguous expected results |

**Canonical sources to fetch:** TestRail / Xray / Zephyr Scale /
Allure TestOps / Qase.io official docs; ISTQB Test Manager syllabus on
test conditions and coverage items; ISO/IEC/IEEE 29119-3 (test
documentation).

### qa-defect-management (new plugin)

**Why missing matters:** every team handles bugs but the lifecycle
patterns (severity vs. priority vs. probability, duplicate detection,
defect taxonomies, root-cause categorisation) are nowhere in the
catalog. `qa-bug-repro` covers *reproducing* a defect; this plugin
covers everything else.

**Nearest existing components:** `qa-bug-repro` (sibling), `qa-test-reporting`.

**Differentiation axis:** bug-repro is execution-focused (run the
failing scenario); this is workflow / classification / lifecycle.

**Suggested components:**

| Type | Name | Archetype | Purpose |
|---|---|---|---|
| skill | bug-lifecycle-reference | S2 | New → triaged → in-progress → fixed → verified → closed states |
| skill | severity-vs-priority-reference | S2 | The two axes, with worked examples |
| skill | defect-taxonomy-istqb | S2 | ISTQB defect categories (functional, performance, usability, …) |
| skill | jira-bug-workflow-runner | S1 | Author / triage / link bugs in Jira |
| skill | linear-bug-workflow-runner | S1 | Same for Linear |
| skill | github-issues-bug-workflow | S1 | Same for GitHub Issues with template enforcement |
| skill | bug-report-from-failure | S3 | Build a complete bug report from a test failure + repro steps |
| agent | duplicate-defect-finder | A1 | Search the bug tracker for likely duplicates before file |
| agent | bug-report-critic | A3 | Reject bug reports missing repro, expected/actual, environment |

**Canonical sources to fetch:** ISTQB glossary (`defect`, `bug`,
`failure`, `error`), IEEE 1044 defect classification, Jira / Linear /
GitHub Issues docs, ISO/IEC/IEEE 29119-3 on defect reporting.

### qa-risk-based-testing (new plugin)

**Why missing matters:** risk-based testing is the dominant
prioritisation framework in ISTQB-aligned organisations and in modern
fast-moving product teams. The catalog has nothing that walks an author
through risk identification, impact × likelihood scoring, or
test-coverage-vs-risk mapping.

**Nearest existing components:** `qa-process`, `qa-test-impact-analysis`.

**Differentiation axis:** test-impact-analysis is about *change → test
selection* (technical, CI-driven); this is about *risk → test
prioritisation* (business / product-driven, upstream of execution).

**Suggested components:**

| Type | Name | Archetype | Purpose |
|---|---|---|---|
| skill | istqb-risk-based-testing-reference | S2 | ISTQB Test Manager view of RBT |
| skill | risk-impact-likelihood-matrix-reference | S2 | The 5×5 / 3×3 matrices, scoring rubrics |
| skill | product-risk-matrix-builder | S3 | Build a per-feature risk matrix from requirements |
| skill | project-risk-register-builder | S3 | Project-level risk register (schedule, env, people) |
| skill | risk-coverage-mapper | S3 | Map test cases / suites to risk items |
| skill | risk-acceptance-decision-skill | S3 | Document risk-acceptance decisions for unfixed defects |
| agent | risk-assessment-critic | A3 | Reject risk assessments missing likelihood justification or coverage gaps |

**Canonical sources to fetch:** ISTQB CTAL-TM syllabus chapters on
risk-based testing; ISO 31000 (risk management); examples from FMEA
literature.

### qa-exploratory-testing (new plugin)

**Why missing matters:** `qa-manual-testing` contains *some* exploratory
content but exploratory testing has its own discipline (SBTM, charters,
heuristics) deep enough to warrant its own plugin. Heuristic models
(HICCUPPS-F, SFDPOT, FCC-CUTS-VIDS, CRUSSPIC-STMPL) are well-cited and
nowhere in the catalog.

**Nearest existing components:** `qa-manual-testing` (sibling),
`qa-test-review`.

**Differentiation axis:** manual-testing covers structured scripted
manual execution; this covers unscripted heuristic-driven exploration.

**Suggested components:**

| Type | Name | Archetype | Purpose |
|---|---|---|---|
| skill | sbtm-reference | S2 | Session-Based Test Management (Bach / Bolton) |
| skill | charter-author | S3 | Build a focused exploration charter (mission + areas + tactics) |
| skill | session-debrief-template | S3 | PROOF (Past / Results / Outlook / Obstacles / Feelings) debrief structure |
| skill | hiccupps-f-heuristic | S2 | History / Image / Comparable / Claims / Users / Product / Purpose / Familiar (problems) / Standards |
| skill | sfdpot-heuristic | S2 | Structure / Function / Data / Platform / Operations / Time |
| skill | fcc-cuts-vids-heuristic | S2 | Format / Coverage / Constraints / Users / Tasks / Sequences / Variables / Inputs / Data / Storage |
| skill | crusspic-stmpl-heuristic | S2 | Capability / Reliability / Usability / Security / Scalability / Performance / Installability / Compatibility — Supportability / Testability / Maintainability / Portability / Localisability |
| agent | charter-coach | A2 | Take a vague exploration goal and shape it into a charter with explicit mission |
| agent | session-debrief-extractor | A1 | Pull issues / questions / coverage / risks from a session note |

**Canonical sources to fetch:** James Bach / Michael Bolton's writings
on SBTM (satisfice.com / developsense.com); Elisabeth Hendrickson's
*Explore It!*; the heuristic models as published in their canonical
references (satisfice.com test-heuristics).

### qa-fuzz-testing (new plugin)

**Why missing matters:** structure-aware fuzzing (libFuzzer, AFL++,
Atheris, Jazzer, native Go / cargo fuzz) is a primary technique for
finding security-critical and robustness bugs. The catalog's
property-based plugin covers Hypothesis / fast-check / proptest /
jqwik / Stout, but fuzzing is a different discipline — corpus
management, sanitiser integration, OSS-Fuzz onboarding.

**Nearest existing components:** `qa-property-based` (sibling),
`qa-sast`, `qa-dast`.

**Differentiation axis:** property-based testing is hypothesis-driven
with shrinking; fuzzing is coverage-guided with corpus evolution and
crash-detection sanitisers.

**Suggested components:**

| Type | Name | Archetype | Purpose |
|---|---|---|---|
| skill | libfuzzer-cpp | S1 | LibFuzzer + sanitisers for C/C++ |
| skill | afl-plus-plus | S1 | AFL++ fuzzing harness authoring |
| skill | go-native-fuzzing | S1 | `go test -fuzz` (Go 1.18+) |
| skill | cargo-fuzz-rust | S1 | cargo-fuzz / libFuzzer-rust |
| skill | atheris-python-fuzzing | S1 | Atheris (Python coverage-guided) |
| skill | jazzer-jvm-fuzzing | S1 | Jazzer for Java / Kotlin |
| skill | ossfuzz-integration | S1 | Onboard a project to Google OSS-Fuzz |
| skill | corpus-management-reference | S2 | Seed corpora, minimisation, dictionary files |
| skill | sanitiser-integration-reference | S2 | ASan / UBSan / MSan / TSan + fuzzers |
| agent | fuzz-target-author | A4 | Scaffold a fuzz target from a parsing / decoding function |

**Canonical sources to fetch:** llvm.org libFuzzer docs; AFL++ docs;
Go 1.18 fuzzing announcement + `testing/fuzz` package docs; Atheris /
Jazzer GitHub READMEs; OSS-Fuzz `getting started` docs.

### qa-cross-browser (new plugin)

**Why missing matters:** `qa-web-e2e` covers single-runner Playwright /
Cypress patterns. Real teams use cloud browser grids (BrowserStack /
Sauce Labs / LambdaTest) and have explicit browser-matrix strategies
the catalog has nothing to say about.

**Nearest existing components:** `qa-web-e2e`, `qa-compatibility`.

**Differentiation axis:** web-e2e is single-environment; compatibility
is broader (devices, OS, screen sizes); this is specifically about
browser-grid strategy + cloud-grid tool integration.

**Suggested components:**

| Type | Name | Archetype | Purpose |
|---|---|---|---|
| skill | browserstack-automate | S1 | Run E2E suites against BrowserStack Automate |
| skill | saucelabs-automate | S1 | Same for Sauce Labs |
| skill | lambdatest-automate | S1 | Same for LambdaTest |
| skill | playwright-cross-browser | S1 | Playwright project configs for Chromium / Firefox / WebKit |
| skill | selenium-grid-runner | S1 | Self-hosted Selenium Grid 4 |
| skill | browser-matrix-strategy-reference | S2 | When to test against full matrix vs. tiered (T1/T2/T3 browsers) |
| skill | flaky-grid-failure-decider | S3 | Distinguish grid-flake from app-bug from browser-engine-difference |

**Canonical sources to fetch:** BrowserStack / Sauce Labs / LambdaTest
official docs; Playwright `playwright.config.ts` reference; Selenium
Grid 4 docs; statcounter.com browser-share data for matrix calibration.

### qa-test-data-privacy (new plugin)

**Why missing matters:** `qa-test-data` covers data generation but not
the privacy / masking / PII handling that real teams need when their
test environments are downstream of production. GDPR / CCPA scrutiny
makes this a deployment-blocking gap for many orgs.

**Nearest existing components:** `qa-test-data`, `qa-compliance`,
`qa-secrets`.

**Differentiation axis:** test-data is about *availability* (do we have
data to test with?); compliance is regulatory umbrella; this is
specifically about *transforming* prod data into safe test data, and
generating *synthetic* substitutes.

**Suggested components:**

| Type | Name | Archetype | Purpose |
|---|---|---|---|
| skill | presidio-pii-detection | S1 | Microsoft Presidio for PII detection + masking |
| skill | faker-synthetic-data | S1 | Python Faker / faker-js / Java JavaFaker libraries |
| skill | synthea-healthcare-data | S1 | Synthetic patient records for HIPAA-bound systems |
| skill | data-masking-techniques-reference | S2 | Tokenisation / shuffling / nulling / encryption-at-rest |
| skill | pii-categories-reference | S2 | GDPR Art. 4(1) personal data, CCPA personal info, sensitive data |
| skill | pii-masking-pipeline-builder | S3 | Build a refresh pipeline: prod-snapshot → mask → load to staging |
| agent | pii-leak-critic | A3 | Spot PII patterns leaking into test fixtures / logs / CI |

**Canonical sources to fetch:** microsoft.github.io/presidio docs;
Faker docs (Python / JS / Java); Synthea documentation; GDPR Article 4
text; CCPA / CPRA statutes; NIST SP 800-122.

## Tier 2 — Common gaps

Narrower or more specialised than T1, but commonly requested by real
teams.

### qa-graphql (new plugin)

GraphQL has enough distinct testing surface (introspection, persisted
queries, dataloader N+1, subscription transport) to warrant its own
plugin rather than being absorbed into `qa-api-testing`.

**Components to scope:** apollo-server-test, graphql-yoga-test,
hasura-test, mercurius-test (fastify-graphql), pothos-builder-tests,
introspection-attack-surface-reference, persisted-query-strategy-reference,
n-plus-one-query-detector (A1).

**Canonical sources:** spec.graphql.org (October 2021), Apollo Server
docs, graphql-yoga docs, hasura.io/docs.

### qa-grpc (new plugin)

Partial coverage today in `qa-realtime-protocols` and `qa-api-testing`,
but gRPC contract testing (buf), load (ghz), and streaming patterns
deserve a dedicated plugin.

**Components to scope:** buf-cli-lint-breaking-build, ghz-load,
grpcurl-cli, grpc-mock, protobuf-versioning-strategy-reference,
grpc-streaming-test-author (S3), grpc-status-code-mapping-reference (S2).

**Canonical sources:** grpc.io docs, buf.build/docs, ghz.sh,
protobuf.dev.

### qa-feature-flags (new plugin)

Feature flag platforms (LaunchDarkly, Unleash, Flagsmith, GrowthBook)
introduce test-matrix complexity (flag × variant × user-segment) the
catalog doesn't address. Flag-coverage strategies, kill-switch
testing, percentage-rollout validation.

**Components to scope:** launchdarkly-testing, unleash-testing,
flagsmith-testing, growthbook-testing, feature-flag-test-matrix-reference,
flag-state-coverage-builder (S3), stale-flag-detector (A1),
flag-removal-runbook-author (S3).

**Canonical sources:** launchdarkly.com/docs, getunleash.io/docs,
flagsmith.com/docs, growthbook.io/docs.

### qa-serverless (new plugin)

Lambda / Cloud Functions / Vercel Functions / Cloudflare Workers have
specific testing patterns (cold-start budgets, timeout testing, local
emulators, edge-runtime divergence) absent from the catalog.

**Components to scope:** aws-sam-local-testing, lambda-test-tools-net,
cloudflare-workers-miniflare, vercel-edge-runtime-testing,
netlify-functions-test, serverless-framework-test-plugin,
cold-start-budget-reference (S2), lambda-timeout-budget-reference (S2),
serverless-integration-test-builder (S3).

**Canonical sources:** aws.amazon.com/serverless docs,
developers.cloudflare.com/workers, vercel.com/docs/functions,
docs.netlify.com/functions, www.serverless.com/docs.

### qa-time-and-timezones (new plugin)

Time-based bugs (DST transitions, leap seconds, timezone arithmetic,
clock skew across services) are a high-incident-rate category with
specific test tooling (libfaketime, sinon fake-timers, freezegun,
timecop, jest fake timers).

**Components to scope:** libfaketime-c, sinon-fake-timers-js,
jest-fake-timers, freezegun-python, timecop-ruby,
mockclock-jvm, dst-transition-reference, leap-second-reference,
iso-8601-vs-rfc-3339-reference, timezone-test-matrix-builder (S3).

**Canonical sources:** library docs for each fake-timer; IETF
RFC 3339; ICU timezone database notes; pytz / zoneinfo docs.

### qa-cache-testing (new plugin)

Cache invalidation is famously hard. Layer-specific testing patterns
(Redis, CDN, browser cache, Varnish, Fastly) aren't covered.

**Components to scope:** redis-cache-tests, cdn-cache-purge-tests
(Cloudflare / Fastly / CloudFront), varnish-test-vtc-syntax,
browser-cache-control-tests, cache-coherence-patterns-reference,
cache-stampede-reference, stale-while-revalidate-reference,
cache-key-collision-detector (A1).

**Canonical sources:** redis.io, varnish-cache.org, fastly.com/docs,
developers.cloudflare.com/cache, RFC 9111 (HTTP caching).

### qa-multi-tenancy (new plugin)

Tenant isolation testing — row-level security, shared-pool versus
silo, cross-tenant data leak detection — is a deployment-blocking
requirement for B2B SaaS and absent from the catalog.

**Components to scope:** tenant-isolation-models-reference,
row-level-security-postgres-reference, tenant-leak-test-author (S3),
cross-tenant-data-leak-tests (S3), tenant-id-propagation-tracer (A1),
tenant-leak-critic (A3).

**Canonical sources:** AWS SaaS Tenant Isolation whitepaper; Postgres
RLS docs; Microsoft "Multitenant SaaS database tenancy patterns" docs.

### qa-payment (new plugin)

Payment processing is one of the highest-stakes testing domains and
has well-defined sandbox flows from Stripe / Adyen / PayPal / Braintree
that nothing in the catalog covers.

**Components to scope:** stripe-test-cards-and-webhooks,
adyen-test-mode, paypal-sandbox, braintree-test-cards,
3ds-test-flow-reference, pci-dss-scope-reference,
payment-flow-states-reference, refund-test-matrix-builder (S3),
chargeback-flow-test-author (S3), payment-webhook-replay-skill (S3).

**Canonical sources:** stripe.com/docs/testing, docs.adyen.com/checkout/test,
developer.paypal.com/tools/sandbox, developer.paypal.com/braintree,
PCI DSS v4.0 spec.

### qa-experimentation (new plugin)

A/B test harness validation (statistical-validity checks,
sample-ratio-mismatch detection, randomisation tests) — distinct from
feature-flag testing.

**Components to scope:** statsig-test, optimizely-test, vwo-test,
amplitude-experiment-test, sample-ratio-mismatch-detector (A1),
ab-test-validity-checklist (S3), guardrail-metrics-reference (S2),
peeking-problem-reference (S2).

**Canonical sources:** docs.statsig.com, docs.optimizely.com,
amplitude.com/docs/experiment, Kohavi/Tang/Xu *Trustworthy Online
Controlled Experiments* (book; cite by ISBN), Microsoft Experimentation
Platform papers.

## Tier 3 — Previously excluded categories now open

The following categories were on the old NOT-GAPS exclusion list. They
are now open to differentiated contributions. Each remains niche
relative to the T1/T2 plugins above, but a sharply-scoped contribution
that satisfies the rating bar is welcome.

### qa-game

**Why it was excluded:** "niche audience" per the old doctrine.

**Why it's worth opening now:** game testing is a well-defined
discipline (functional, gameplay, balance, multiplayer load, certification
on Sony / Nintendo / Microsoft / Steam platforms) with engine-specific
tooling that doesn't fit anywhere else.

**Components to scope:** unity-test-framework, unreal-automation-system,
godot-gut-tests, game-test-categories-reference (S2 — functional /
gameplay / balance / load / cert / soak), multiplayer-state-machine-coverage,
platform-cert-overview-reference (S2 — Sony TRC / Nintendo Lotcheck /
MS XR / Steam), gameplay-recording-replay-skill.

**Canonical sources:** docs.unity3d.com Test Framework, docs.unrealengine.com
Automation, docs.godotengine.org GUT plugin, platform-holder developer
portals (gated; cite by stable ID).

### qa-desktop

**Why it was excluded:** "niche audience".

**Why it's worth opening now:** Electron apps are widespread (VS Code,
Slack, Discord, Figma desktop). WinAppDriver / Appium-Windows are the
canonical tools for native Windows desktop. macOS XCTest and
Linux AT-SPI testing have their own niches.

**Components to scope:** electron-playwright, electron-spectron (legacy
reference), winappdriver, appium-windows-driver, qt-test-framework,
xctest-mac-desktop, at-spi-linux, desktop-test-strategy-reference.

**Canonical sources:** playwright.dev/docs/api/class-electron;
github.com/microsoft/WinAppDriver; appium.io/docs;
doc.qt.io/qt-6/qttest-overview.html.

### qa-browser-extension

**Why it was excluded:** "niche audience".

**Why it's worth opening now:** the Manifest V3 transition broke many
extension test patterns. There is no mainstream coverage of
extension-specific test surfaces (service worker, content scripts,
storage.sync, host permission prompts).

**Components to scope:** web-ext-cli-mozilla, chrome-extension-test-loader,
playwright-extension-fixtures, manifest-v3-test-surface-reference (S2),
mv2-to-mv3-migration-test-checklist (S3),
extension-storage-test-author (S3).

**Canonical sources:** developer.chrome.com/docs/extensions,
extensionworkshop.com (Mozilla web-ext docs), developer.mozilla.org/MDN
WebExtensions.

### qa-pwa

**Why it was excluded:** absorbed into "modern web" assumptions.

**Why it's worth opening now:** service-worker lifecycle, offline /
install / push notifications all have specific test patterns Workbox
docs cover that nothing in `qa-modern-web` exposes.

**Components to scope:** workbox-tests, lighthouse-pwa-audit,
service-worker-lifecycle-test, offline-fallback-test,
add-to-homescreen-flow-test, web-push-test, pwa-install-flow-reference.

**Canonical sources:** developer.chrome.com/docs/workbox,
web.dev/learn/pwa, developer.mozilla.org Service Worker API.

### qa-embedded

**Why it was excluded:** "niche audience".

**Why it's worth opening now:** Unity / Ceedling / GoogleTest are the
canonical C/C++ embedded harnesses; HIL (hardware-in-loop) testing has
specific tooling (Vector CANoe, NI VeriStand) the catalog could touch.

**Components to scope:** googletest-embedded-arm, unity-test-framework-c,
ceedling-build-runner, qemu-system-test-runner,
hardware-in-loop-reference, ceedling-mocks-reference,
embedded-coverage-strategy-reference.

**Canonical sources:** github.com/google/googletest,
www.throwtheswitch.org/unity, www.throwtheswitch.org/ceedling,
qemu.org/docs.

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
  under `qa-accessibility-specifics`. "Audit my app for WCAG" as a
  single skill is still bad scope but no longer name-blocked.

## Within-plugin extensions

Skills and agents that would deepen existing plugins without warranting
a new top-level plugin. Listed in plugin order for easy scanning.

### qa-process

- `quality-metrics-dora-space-reference` (S2) — DORA / SPACE /
  DevEx metrics applied to QA.
- `team-test-strategy-author` (S3) — per-team test strategy doc
  builder (IEEE 829-adjacent).

### qa-roles

- `engineering-manager-quality-coach` (A3) — coach EM on quality
  conversations in 1:1s.
- `release-manager-cutover-checklist` (S3) — extends release-engineer.

### qa-test-data

- `mimesis-python` (S1) — Mimesis as Faker alternative.
- `factory-bot-rails` (S1) — Rails / Ruby factory pattern.
- `factory-boy-django` (S1) — Django equivalent.
- `bogus-net` (S1) — .NET Faker equivalent.
- `synthetic-event-stream-builder` (S3) — generate Kafka / Kinesis
  test streams.

### qa-test-environment

- `devcontainers-test-env` (S1) — VS Code devcontainer.json for QA-ready environments.
- `nix-shell-test-env` (S1) — reproducible test environments via Nix.
- `testcontainers-go` (S1) — Go testcontainers (sibling of existing language skills).

### qa-test-reporting

- `junit-xml-parser-skill` (S2) — JUnit XML schema reference.
- `xunit-net-reporter` (S1) — xUnit.net reporter integration.
- `allure-3-reporter` (S1) — Allure 3 if/when it ships.
- `currents-dashboard-integration` (S1) — currents.dev as Cypress dashboard alt.

### qa-test-impact-analysis

- `nx-affected-test-runner` (S1) — Nx monorepo affected-test selection.
- `bazel-test-affected-selection` (S1) — Bazel `--affected` selection.

### qa-test-review

- `review-comment-conventions-reference` (S2) — review comment
  taxonomy (blocking / non-blocking / nit / question / praise).
- `pr-test-coverage-critic` (A3) — agent that rejects PRs lacking
  meaningful new test coverage on changed code paths.

### qa-api-testing

- `oas-spec-validation` (S1) — OpenAPI spec lint + validate.
- `prism-mock-server` (S1) — OpenAPI mock from spec.
- `mockoon-builder` (S1) — local mock GUI / CLI.
- `dredd-contract-runner` (S1) — Dredd API/spec testing.
- `schemathesis-fuzzer` (S1) — schema-based API fuzzing.

### qa-bdd

- `cucumber-rules-runner` (S1) — Rules-style Gherkin (Cucumber 7+).
- `karate-bdd` (S1) — Karate framework (API-focused Gherkin).
- `gauge-framework` (S1) — Gauge as Cucumber alternative.

### qa-contract-testing

- `pact-broker-self-hosting` (S1) — Pact Broker setup.
- `pactflow-integration` (S1) — managed Pact (Pactflow).
- `spring-cloud-contract` (S1) — JVM contract testing.

### qa-mobile-native

- `detox-react-native` (S1) — Detox E2E for RN.
- `maestro-mobile-flows` (S1) — Maestro YAML flows.
- `xctest-runner` (S1) — XCTest for iOS native.
- `espresso-runner` (S1) — Espresso for Android native.
- `firebase-test-lab-runner` (S1) — Firebase Test Lab device farm.

### qa-mutation-testing

- `mutmut-python` (S1) — mutmut as alternative to existing Python entry.
- `infection-php` (S1) — Infection for PHP.

### qa-property-based

- `proptest-rust` (S1) — proptest for Rust.
- `gopter-go` (S1) — gopter for Go.

### qa-web-e2e

- `puppeteer-testing` (S1) — Puppeteer-specific patterns.
- `webdriver-io-testing` (S1) — WebdriverIO (sync mode, multi-remote).
- `screenplay-pattern-reference` (S2) — Screenplay vs Page Object.
- `page-object-pattern-reference` (S2) — Page Object Model canonical.
- `playwright-component-testing` (S1) — Playwright component-test mode.

### qa-accessibility-specifics

- `axe-devtools-cli` (S1) — Deque axe DevTools CLI.
- `pa11y-runner` (S1) — pa11y CLI runner.
- `lighthouse-a11y-only` (S1) — Lighthouse a11y audit subset.
- `wave-evaluator` (S1) — WAVE API.
- `nvda-screen-reader-test-script-reference` (S2) — manual NVDA test scripts.
- `voiceover-test-script-reference` (S2) — manual VoiceOver test scripts.

### qa-visual-regression

- `chromatic-storybook` (S1) — Chromatic for Storybook.
- `percy-snapshot` (S1) — Percy CLI.
- `loki-storybook` (S1) — Loki visual diff for Storybook.

### qa-localization

- `pseudo-localization-runner` (S3) — generate pseudo-locales for layout drift detection.
- `rtl-test-runner` (S3) — RTL layout regression tests.
- `icu-messageformat-validator` (S1) — ICU MessageFormat plural/select validation.

### qa-sast

- `codeql-rule-author` (S1) — write custom CodeQL queries.
- `sonar-scanner-cli` (S1) — SonarQube CLI scan.

### qa-dast

- `nuclei-templates-scanner` (S1) — ProjectDiscovery Nuclei templates.
- `caido-proxy` (S1) — Caido as Burp Suite alternative.

### qa-sca

- `osv-scanner` (S1) — Google OSV-Scanner.
- `dependabot-config-author` (S1) — Dependabot config patterns.
- `renovate-config-author` (S1) — Renovate config patterns.

### qa-secrets

- `trufflehog-scanner` (S1) — TruffleHog secrets scanner.
- `detect-secrets-yelp` (S1) — Yelp detect-secrets.

### qa-flake-triage

- `test-quarantine-policies-reference` (S2) — when / how / for how long.
- `flake-bug-template-author` (S3) — file a flake bug with classification.

### qa-load-testing

- `vegeta-load` (S1) — Tsenart Vegeta.
- `wrk2-load` (S1) — Will Glozer wrk2.
- `bombardier-load` (S1) — bombardier HTTP/2 / fast Go-native.
- `artillery-load` (S1) — Artillery (cloud / OSS).
- `slo-error-budget-reference` (S2) — error-budget math for load tests.

### qa-ci-integration

- `github-actions-test-workflow-author` (S3) — `.github/workflows/test.yml` patterns.
- `circleci-test-config-author` (S3) — CircleCI `config.yml` test patterns.
- `gitlab-ci-test-author` (S3) — `.gitlab-ci.yml` test patterns.
- `buildkite-test-author` (S3) — Buildkite pipeline test patterns.
- `azure-pipelines-test-author` (S3) — Azure Pipelines YAML test patterns.

### qa-shift-right

- `synthetic-monitoring-author` (S3) — Pingdom / Datadog Synthetics / Checkly script author.
- `canary-validator` (S3) — canary-release validation gate.
- `featureflag-rollback-runbook-author` (S3).

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
5. **Self-rate D1–D6.** Total ≥21, d6 ≥1.
6. **PR.** Use `.github/pull_request_template.md`.

If you think a gap is missing from this document, open an issue with
your nearest-neighbour analysis and we'll add it.
