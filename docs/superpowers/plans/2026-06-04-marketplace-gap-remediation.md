# Marketplace Gap-Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every issue surfaced by the 2026-06-04 marketplace review — relation defects, stale docs, missing unifier/critic agents, missing author/scaffolder/orchestrator agents, structural inconsistencies, the head-of-QA cross-team blind spot, the junior on-ramp gap, and the full net-new tool-wrapper backlog — bringing all 77 plugins to a [Healthy] verdict.

**Architecture:** This is a Pattern-B2 marketplace of markdown skills/agents, not code. Each component is a `SKILL.md` or `agent.md` with YAML frontmatter, drafted from canonical sources fetched at authoring time and cited inline. The "test suite" is the validation pipeline (`validate.sh`, `rating-check.sh`, `content-audit.py --strict`, `composition-graph.py`) plus the `version-bump-check.py` guardrail and `generate-catalog.py` drift check. There is no pytest; **a task is "green" when those gates pass.** Every plugin touched gets a `plugin.json` version bump and a `CATALOG.md` regeneration.

**Tech Stack:** Markdown + YAML frontmatter; Python/Bash validation scripts; `make all`. Authoring recipe is `docs/PLUGIN_AUTHORING.md` (Steps 1–11). Reviewer rubric is `docs/REVIEWER_CHECKLIST.md`.

---

## Conventions used throughout this plan

### Priorities
- **P1** — verified defect or established-pattern gap (must-fix; highest value/effort).
- **P2** — structural consistency, manual/junior coverage, strategic layer.
- **P3** — net-new tool/coverage skills (the ROADMAP-style long tail).

### Shared Definition of Done — every NEW SKILL task
Follow `docs/PLUGIN_AUTHORING.md` Steps 1–10. A skill task is done when ALL of:
- [ ] `skills/<name>/SKILL.md` created with `name`, third-person `description` (with a "Use when…" trigger), `rating`, `d6` frontmatter.
- [ ] Body drafted from **freshly WebFetched canonical sources**, every concrete claim cited inline at point of use (no trailing-only References block). d6 ≥ 1 or the gate hard-rejects.
- [ ] Body matches a common shape (file-format wrapper / pure reference / build-an-X / toolkit) per PLUGIN_AUTHORING "Common component shapes."
- [ ] Self-rated D1–D6, total ≥ 21; `rating` + `d6` stamped.
- [ ] Plugin `README.md` component table row added.
- [ ] No em/en dashes in prose (`validate.sh` advisory) and no Windows backslash paths in examples (`content-audit.py --strict`).
- [ ] `bash scripts/validate.sh .` + `bash scripts/rating-check.sh .` + `python3 scripts/content-audit.py --strict` pass.
- [ ] Plugin `plugin.json` `version` bumped (see per-plugin version map at the end).

### Shared Definition of Done — every NEW AGENT task
As above, plus:
- [ ] Body 30–60 lines; reference material lives in preloaded skills, not the body.
- [ ] `tools:` is the minimum needed; `Bash(...)` patterns are specific.
- [ ] If the agent composes skills, `skills:` frontmatter lists them and they exist (`python3 scripts/composition-graph.py` resolves them with no MISSING line).
- [ ] Read-only/critic agents ≥120 lines have an explicit `## Output format` section.
- [ ] Agent registered in `componentThemeCoverage`-equivalent? **N/A for this repo** — instead confirm `composition-graph.py` is green.

### Shared Definition of Done — every PLUGIN closeout
- [ ] `plugin.json` `version` bumped once for all changes to that plugin.
- [ ] `README.md` component table reflects the final component set.
- [ ] `docs/COMPOSITION.md` per-plugin subsection updated **by hand** if agent→skill edges changed (it is NOT generated).

### Global closeout (Phase 8) is mandatory after any phase that ships components
`python3 scripts/generate-catalog.py` → commit `CATALOG.md`; `python3 scripts/version-bump-check.py`; refresh the `77 plugins / N components` count in `CATALOG.md` header, `README.md`, `CLAUDE.md`, `docs/ROADMAP.md`. Then in `testland-web`: `npm run dev`/`build` re-runs `sync-plugins.mjs`.

---

## Phase 0 — Verified defects & documentation fixes (P1, do first)

### Task 0.1: Fix `selenium-grid-orchestrator` missing `skills:` block

**Files:**
- Modify: `plugins/qa-web-e2e/agents/selenium-grid-orchestrator.md` (frontmatter, after `d6: 3`)
- Modify: `plugins/qa-web-e2e/.claude-plugin/plugin.json` (version bump)

- [ ] **Step 1:** Read `plugins/qa-web-e2e/agents/selenium-grid-orchestrator.md` and confirm the body references `selenium-testing`, `browserstack-automate`, `saucelabs-automate`, `lambdatest-automate`. Confirm those four skill directories exist under `plugins/qa-web-e2e/skills/`.
- [ ] **Step 2:** Add a `skills:` block to the frontmatter listing exactly the skills the body composes:
```yaml
skills:
  - selenium-testing
  - browserstack-automate
  - saucelabs-automate
  - lambdatest-automate
```
- [ ] **Step 3:** Bump `qa-web-e2e` version `1.3.0` → `1.4.0` (new capability wiring) in `plugin.json`.
- [ ] **Step 4:** Run `python3 scripts/composition-graph.py` — expect the new edges to appear and zero MISSING lines. Run `bash scripts/validate.sh .` — expect pass.
- [ ] **Step 5:** Commit: `git add plugins/qa-web-e2e/agents/selenium-grid-orchestrator.md plugins/qa-web-e2e/.claude-plugin/plugin.json && git commit` with message `fix(qa-web-e2e): wire selenium-grid-orchestrator skills preloads`.

### Task 0.2: Fix `test-case-quality-auditor` missing preload

**Files:** Modify `plugins/qa-process/agents/test-case-quality-auditor.md`; bump `plugins/qa-process/.claude-plugin/plugin.json`.

- [ ] **Step 1:** The description already names `test-case-from-live-feature` as an input format the auditor parses, but `skills:` lists only `test-case-ideation-from-story`. Add the second skill:
```yaml
skills:
  - test-case-ideation-from-story
  - test-case-from-live-feature
```
- [ ] **Step 2:** Bump `qa-process` `1.5.0` → `1.5.1`.
- [ ] **Step 3:** Run `python3 scripts/composition-graph.py` (expect resolve), `bash scripts/validate.sh .` (pass).
- [ ] **Step 4:** Commit `fix(qa-process): preload test-case-from-live-feature in case-quality-auditor`.

### Task 0.3: Fix `visual-diff-classifier` → `visual-baseline-gate` pipeline break

**Files:** Modify `plugins/qa-visual-regression/agents/visual-diff-classifier.md`; bump plugin.json.

- [ ] **Step 1:** The classifier produces the input the `visual-baseline-gate` skill consumes, but neither preloads nor hands off to it. Because the classifier is read-only and the gate is a CI-aggregation skill, the correct fix is a **hand-off**, not a preload. Add a `## Hand-off` section to the agent body:
```markdown
## Hand-off
After classification, feed the per-diff verdicts into the
[`visual-baseline-gate`](../skills/visual-baseline-gate/SKILL.md) skill to
aggregate them into a single CI BLOCK / REVIEW / OK verdict.
```
- [ ] **Step 2:** Bump `qa-visual-regression` `1.0.0` → `1.1.0`.
- [ ] **Step 3:** `bash scripts/validate.sh .` (pass). Commit `fix(qa-visual-regression): hand off classifier output to baseline gate`.

### Task 0.4: Optional preload tightening (P2)

**Files:** `plugins/qa-roles/agents/quality-coach.md`, `plugins/qa-feature-flags/agents/stale-flag-detector.md`; bump both plugin.json.

- [ ] **Step 1:** `quality-coach` — add `skills:\n  - definition-of-done` (cross-plugin from qa-process) so the enforcer cites the canonical DoD field list inline. Verify the skill name is exactly `definition-of-done` (read `plugins/qa-process/skills/`).
- [ ] **Step 2:** `stale-flag-detector` — add `flag-removal-runbook-author` to `skills:` (it is the documented downstream action) and update the description's trailing "Preloads …" sentence to include it.
- [ ] **Step 3:** Bump `qa-roles` `1.1.1` → `1.2.0`, `qa-feature-flags` `1.0.0` → `1.1.0`.
- [ ] **Step 4:** `python3 scripts/composition-graph.py` (resolve), `validate.sh` (pass). Commit `refactor(qa-roles,qa-feature-flags): tighten agent skill preloads`.

> NOTE: `n-plus-one-query-detector`'s `persisted-query-strategy-reference` preload is **intentional and documented** in its description — do NOT remove it. The review's "loose preload" flag was a false positive (verified 2026-06-04).

### Task 0.5: Fix stale / mismatched plugin READMEs

**Files:** `plugins/qa-payment/README.md`, `plugins/qa-serverless/README.md`, `plugins/qa-time-and-timezones/README.md`, `plugins/qa-manual-testing/README.md`. (No version bump — README-only? **No:** README changes ship to users, so bump each plugin's patch version.)

- [ ] **Step 1:** `qa-payment/README.md` — replace the `(filled in as components are added)` placeholder table with a real component table listing all 10 skills (read `plugins/qa-payment/skills/` for names + each SKILL.md `description`). Remove the duplicated REVIEWER_CHECKLIST sentence at the end.
- [ ] **Step 2:** `qa-serverless/README.md` and `qa-time-and-timezones/README.md` — same placeholder-table fix; list all 9 and 10 skills respectively.
- [ ] **Step 3:** `qa-manual-testing/README.md` — add the 5 missing reference skills to the component table: `sbtm-reference`, `hiccupps-f-heuristic`, `sfdpot-heuristic`, `fcc-cuts-vids-heuristic`, `crusspic-stmpl-heuristic` (the table currently lists 6 of 11).
- [ ] **Step 4:** Bump each of the 4 plugins' patch versions.
- [ ] **Step 5:** `bash scripts/validate.sh .` (pass). Commit `docs: fix stale/mismatched plugin READMEs (payment, serverless, time, manual-testing)`.

### Task 0.6: Add a README-vs-filesystem lint to `content-audit.py`

**Files:** Modify `scripts/content-audit.py`; verify with `python3 scripts/content-audit.py --strict`.

- [ ] **Step 1:** Read `scripts/content-audit.py` to learn its check structure and how it reports failures.
- [ ] **Step 2:** Add a check: for each `plugins/<p>/README.md`, count the component rows in the first markdown table whose first cell is `Skill` or `Agent` (case-insensitive), and compare to the count of `skills/*/SKILL.md` + `agents/*.md` (excluding `.gitkeep`) on disk. Emit a failure line if they differ. Keep it advisory-or-strict consistent with the file's existing convention.
- [ ] **Step 3:** Run `python3 scripts/content-audit.py --strict` — expect PASS now that Task 0.5 fixed the known mismatches. If any other plugin trips, fix that README too.
- [ ] **Step 4:** Commit `feat(scripts): lint README component table against filesystem`.

---

## Phase 1 — Missing unifier / critic agents (P1)

Each follows the **NEW AGENT DoD**. Shape = read-only adversarial critic (or action-taking where noted), modelled on the `qa-sast/sast-finding-triager` exemplar: preload the sibling tool-wrapper skills, normalize/dedupe, emit a BLOCK/PASS verdict + `## Output format`. One commit per agent; bump the host plugin's minor version; regen CATALOG at phase end.

| # | Agent (create) | Plugin | Preloads (sibling skills) | Description trigger draft | Canonical sources to cite |
|---|---|---|---|---|---|
|1.1|`secrets-finding-triager`|qa-secrets|`gitleaks-scanning`, `trufflehog-scanning`, `kingfisher-scanning`|"Normalizes multi-scanner secret findings, dedupes by (file,line,secret-class), enforces waivers (expires/approved_by/reason), emits BLOCK/PASS. Use as the CI secrets gate."|gitleaks, trufflehog, kingfisher docs (the three skills already cite these)|
|1.2|`payment-flow-critic`|qa-payment|`payment-flow-states-reference`, `pci-dss-scope-reference`|"Reviews payment-integration code for missing charge idempotency, unverified webhook signatures, PAN-in-logs, unhandled `requires_action` (3DS), double-charge risk. Use in PR review of payment code."|Stripe/Adyen/Braintree security docs, PCI DSS v4.0|
|1.3|`concurrency-critic`|qa-concurrency|`race-condition-test-author`, `deadlock-detection-harness`|"Static pass over concurrency-heavy code for unguarded shared state, lock-ordering risk, missing happens-before. Use in PR review of threaded/async code."|existing skill citations + language memory models|
|1.4|`notebook-quality-reviewer`|qa-data-notebooks|`papermill-tests`, `nbval-tests`, `testbook-tests`|"Reviews a notebook PR for untested cells, nbval-lax misuse, hardcoded creds, non-deterministic outputs, missing parameters tag. Use in notebook PR review."|papermill, nbval, testbook docs|
|1.5|`grpc-service-reviewer`|qa-grpc|`grpc-mock`, `grpc-status-code-mapping-reference`, `protobuf-versioning-strategy-reference`, `buf-cli-lint-breaking-build`|"Reviews a new/changed gRPC service for missing status-code assertions, missing deadline tests, buf lint/breaking not in CI, untested streaming RPCs."|grpc.io, buf.build docs|
|1.6|`realtime-protocol-reviewer`|qa-realtime-protocols|`websocket-tests`, `server-sent-events-tests`, `mqtt-tests`, `webhook-replay-tests`|"Reviews real-time protocol handlers for reconnect logic, close-code handling, webhook signature validation, MQTT QoS, streaming deadlines."|RFC 6455 (WS), HTML SSE spec, MQTT 5 spec|
|1.7|`async-job-health-critic`|qa-async-jobs|`idempotency-test-author`, `cron-job-test-author`|"Scans queue/worker code for missing retry limits, absent DLQ routing, uncapped backoff, missing idempotency keys across BullMQ/Celery/Sidekiq/SQS/RabbitMQ."|existing skill citations|
|1.8|`saga-critic`|qa-saga-cqrs|`saga-transaction-tests`, `event-sourcing-tests`|"Reviews saga/orchestration code for missing compensating transactions, non-idempotent compensation, missing outbox on atomic publish, absent step retry policy."|microservices.io saga/outbox patterns|
|1.9|`serverless-cold-start-critic`|qa-serverless|`cold-start-budget-reference`, `lambda-timeout-budget-reference`|"Reviews serverless function code for cold-start anti-patterns: heavy top-level imports, client init in handler, no /tmp reuse, missing SnapStart for JVM."|AWS Lambda, Cloudflare Workers docs|
|1.10|`time-handling-critic`|qa-time-and-timezones|`dst-transition-reference`, `iso-8601-vs-rfc-3339-reference`|"Scans code for naive `now()` without tz, implicit local-time arithmetic, DST-unsafe parsing, missing ZonedDateTime/ZoneInfo."|IETF RFC 3339, tz database notes|
|1.11|`notification-delivery-critic`|qa-notifications|`webhook-delivery-tester`, `email-flow-test-author`|"Scans notification-send code for missing idempotency, no bounce/unsubscribe handling, missing DKIM/SPF, no retry/backoff on transient SMTP failures."|RFC 5321/6376, provider docs|
|1.12|`token-storage-security-critic`|qa-auth-flows|`session-management-test-author`, `oauth-flow-test-author`|"Scans frontend/mobile code for token-storage anti-patterns (JWT in localStorage, non-httpOnly cookies) per OWASP."|OWASP Token Storage / Session Mgmt cheat sheets|
|1.13|`db-migration-performance-critic`|qa-db-migrations|`flyway-migrations`, `liquibase-migrations`, `atlas-migrations`|"Reviews a migration for index-after-migration gaps, missing ANALYZE, partition-pruning impact, large-table ALTER lock time."|PostgreSQL/MySQL DDL-locking docs|
|1.14|`ci-pipeline-health-critic`|qa-ci-integration|`ci-test-job-conventions`, `github-actions-test-jobs`, `gitlab-ci-test-jobs`, `jenkinsfile-test-stages`, `circleci-test-configs`|"Reviews an existing CI config for missing concurrency-cancel, retry-masking flake, no JUnit upload, no test sharding."|GitHub Actions/GitLab CI/Jenkins/CircleCI docs|
|1.15|`compatibility-matrix-auditor`|qa-compatibility|`browser-matrix-strategy-reference`, `compatibility-budget`, `browser-matrix-runner`|"Audits an existing browser/OS matrix against tiering + budget conventions: stale tiers, no quarterly review, T1 over budget."|caniuse/statcounter, existing skill citations|
|1.16|`fuzz-findings-critic`|qa-fuzz-testing|`corpus-management-reference`, `sanitiser-integration-reference`|"Consumes fuzzer crash artifacts, classifies by sanitizer type, dedupes by stack-hash, emits verdict."|LLVM libFuzzer/ASan docs|
|1.17|`desktop-test-reviewer`|qa-desktop|`desktop-test-strategy-reference`|"Reviews a desktop UI test for screen-object compliance, locator stability, wait primitives, STA/elevation concerns."|FlaUI/WinAppDriver/Appium docs|
|1.18|`cypress-codegen-reviewer`|qa-web-e2e|`test-code-conventions` (qa-test-review)|"Refactors raw Cypress recordings into idiomatic custom-command / page-object patterns (Cypress analog of playwright-codegen-reviewer)."|Cypress best-practices docs|
|1.19|`vacuous-property-critic`|qa-property-based|`property-based-testing-conventions` (or the framework skills)|"Detects properties that pass trivially because assume()/filter() discards >80% of inputs. Use when reviewing fast-check/Hypothesis tests."|fast-check, Hypothesis docs|
|1.20|`data-drift-incident-responder`|qa-ml-models|`evidently-monitoring`|"Takes a live drift alert and produces a root-cause hypothesis + remediation checklist (action-taking)."|Evidently docs|
|1.21|`flag-coverage-gap-detector`|qa-feature-flags|`feature-flag-test-matrix-reference`|"Scans code for flag evaluations whose off-branch has no test. Distinct from stale-flag-detector."|OpenFeature / platform docs|

**Phase 1 closeout:** `python3 scripts/composition-graph.py` green; `rating-check.sh`/`validate.sh`/`content-audit.py --strict` pass; bump each host plugin's minor version; `generate-catalog.py` + commit CATALOG.

---

## Phase 2 — Author/scaffolder agents for skills-only QE plugins (P2)

These give the four `.gitkeep`-only plugins their composing agent, mirroring `qa-pwa/pwa-test-author`. **NEW AGENT DoD.** Each detects the relevant tool from project config, composes the sibling skills, emits one artifact.

| # | Agent | Plugin | Preloads | Trigger |
|---|---|---|---|---|
|2.1|`chart-test-author`|qa-charts-dataviz|`chartjs-snapshot-tests`, `d3-snapshot-tests`, `vega-spec-validator`|Detects Chart.js/D3/Vega from package.json, emits one chart regression test.|
|2.2|`pdf-test-author`|qa-pdf-print-render|`pdf-snapshot-tester`, `print-stylesheet-tests`, `html-to-pdf-regression`, `pdf-accessibility-checker`|Detects PDF engine (page.pdf/WeasyPrint/wkhtmltopdf), emits matching tests.|
|2.3|`modern-web-health-agent`|qa-modern-web|`service-worker-tests`, `pwa-install-flow-tests`, `web-vitals-inp-deep`, `browser-extension-tests`|Runs SW + manifest + INP + extension smoke as one pre-deploy readiness check.|
|2.4|`l10n-audit-runner`|qa-localization|`i18n-string-coverage`, `pseudo-localization-runner`, `rtl-rendering-tester`, `locale-format-validator`|Orchestrates the 4 l10n skills into a single pre-release locale audit report.|

Also create `agents/.gitkeep` removal where the dir gains a real agent. **Closeout** as Phase 1.

---

## Phase 3 — qa-manual-testing & accessibility manual agents (P2, biggest manual-tester win)

| # | Agent | Plugin | Preloads | Trigger |
|---|---|---|---|---|
|3.1|`charter-coach`|qa-manual-testing|`sbtm-reference`, `hiccupps-f-heuristic`, `sfdpot-heuristic`, `exploratory-tours-reference`|Takes a feature + risk areas, produces a well-formed SBTM charter (mission + areas + tactics) using the heuristic catalog. Local to this plugin (do not rely on qa-roles).|
|3.2|`session-debrief-coach`|qa-manual-testing|`manual-test-debrief`, `sbtm-reference`|Reviews a completed session sheet: checks PROOF completeness, flags thin Feelings, detects S%>30% env problems, recommends next charter from Outlook.|
|3.3|`test-script-quality-critic`|qa-manual-testing|`manual-test-script-author`, `test-execution-checklist`|Reviews authored manual scripts for vague preconditions, bundled scenarios, missing expected results.|
|3.4|`screen-reader-test-executor`|qa-accessibility-specifics|`screen-reader-test-author`, `wcag-checklist-builder`|Orchestrates a structured NVDA/VoiceOver session and emits a pass/fail checklist (executes the handoff `accessibility-code-critic` recommends).|

**Closeout** as Phase 1. Note: this finally gives manual/exploratory + manual-a11y testers an agent-driven path.

---

## Phase 4 — Orchestrator / workflow agents (P2)

Multi-stage workflows that today require manual chaining. **NEW AGENT DoD** (action-taking).

| # | Agent | Plugin | Composes | Trigger |
|---|---|---|---|---|
|4.1|`dr-drill-orchestrator`|qa-resilience-drills|`dr-drill-runner`, `backup-verification-author`, `restore-time-tests`|Executes pre-drill checklist → failover → RTO monitor → fail-back → post-drill report. Mirrors `chaos-drill-orchestrator`.|
|4.2|`reliability-review-agent`|qa-resilience-drills|`error-budget-tests`, `mttr-mtbf-tracker`|Composes error-budget + MTTR/MTBF into a weekly manager-facing reliability narrative.|
|4.3|`defect-pipeline-runner`|qa-bug-repro|`bug-report-template`|Chains `defect-clusterer` → `defect-trend-narrator` → `escape-defect-analyzer` as a weekly defect review.|
|4.4|`ci-defect-filer`|qa-defect-management|`bug-report-from-failure`, `jira-bug-workflow-runner`, `linear-bug-workflow-runner`, `github-issues-bug-workflow`|Chains failure→report→dedupe→file in one CI step.|
|4.5|`bdd-scenario-author`|qa-bdd|`gherkin-from-stories`, `acceptance-test-from-criteria`, `bdd-step-library-curator`|Story/AC → Gherkin → step defs → runner selection. Fills the build/critic asymmetry (only `gherkin-style-reviewer` exists).|
|4.6|`test-data-setup-agent`|qa-test-data|`synthetic-data-toolkit`, `seed-data-curator`, `faker-data`|Stands up full test data for a feature (generators + seed + detection).|
|4.7|`mock-server-composer`|qa-test-data|`wiremock-stubs`, `msw-handlers`, `mountebank-imposters`|Detects stack, generates the right mock-server config.|
|4.8|`test-environment-bootstrapper`|qa-test-environment|`testcontainers`, `docker-compose-test`, `feature-flag-test-harness`, `playwright-fixture-builder`|Wires containers → DB → flags → Playwright fixtures for a greenfield service.|
|4.9|`canary-and-experiment-coordinator`|qa-shift-right|`prod-canary-validator`, `feature-flag-experiment-validator`|Coordinates a simultaneous canary + A/B release (cohort contamination check).|
|4.10|`perf-incident-responder`|qa-load-testing|`flame-graph-analyzer`, `db-slow-query-detector`, `k6-load-testing`|On-call orchestrator: bisect → flamegraph → slow-query in one pass.|
|4.11|`risk-storming-session-runner`|qa-process|`risk-storming-facilitator`, `risk-matrix`|Runs a three-amigos risk-storming session → populated matrix.|
|4.12|`release-quality-report-agent`|qa-test-reporting|`test-run-summary-author`, `coverage-diff-reporter`, `unit-test-coverage-targeter`|Evidence-backed go/no-go release report for managers.|
|4.13|`tcm-migration-agent`|qa-test-management|`test-case-anatomy-reference`, the 5 platform skills|Operationalizes field mapping for TCM tool migrations.|
|4.14|`interview-debrief-facilitator`|qa-hiring|`interview-question-author`, `hiring-rubric-author`, `calibration-guide-author`|Runs the post-interview calibration loop → hire/no-hire doc.|
|4.15|`mbt-suite-builder`|qa-ai-assisted|`model-based-test-graph-author`, `ai-test-generator`|Single entry point for the model-based-testing pipeline.|
|4.16|`llm-red-team-planner`|qa-llm-evaluation|`giskard-llm-scan` (confirm name), reference skills|Orchestrates adversarial probing beyond canned categories.|

**Closeout** as Phase 1.

---

## Phase 5 — Structural consistency: selectors, scaffolders, parity skills (P2)

| # | Component | Plugin | Shape | Notes |
|---|---|---|---|---|
|5.1|`jvm-framework-selector`|qa-unit-tests-jvm|agent|Reads pom/gradle/sbt, recommends one framework (5 frameworks × 4 langs).|
|5.2|`assertj`|qa-unit-tests-jvm|skill (tool-wrapper)|First-class AssertJ skill (parity with .NET `fluentassertions`); then add it to `jvm-test-author` preloads.|
|5.3|`go-rust-framework-selector`|qa-unit-tests-go-rust|agent|Reads go.mod/Cargo.toml, recommends framework.|
|5.4|`go-rust-mocking`|qa-unit-tests-go-rust|skill|gomock/testify-mock (Go) + mockall (Rust).|
|5.5|`embedded-framework-selector`|qa-embedded|agent|Selector parity with desktop/mobile.|
|5.6|`embedded-test-scaffolder`|qa-embedded|agent|Emits Ceedling project.yml / GoogleTest CMakeLists for a new project.|
|5.7|`game-test-scaffolder`|qa-game|agent|Emits Unity/Unreal/Godot test dir structure.|
|5.8|`platform-cert-checklist-author`|qa-game|agent|Build-an-X per-platform certification checklist (Xbox XR/Sony TRC/Nintendo Lotcheck/Steam).|
|5.9|`mobile-test-scaffolder`|qa-mobile-native|agent|Emits Detox e2e/ + config / XCUITest target / Espresso module.|
|5.10|`visual-ci-gate-orchestrator`|qa-visual-regression|agent|Pipes `visual-diff-classifier` → `visual-baseline-gate` → BLOCK/REVIEW/OK.|

**Closeout** as Phase 1.

---

## Phase 6 — Net-new tool-wrapper & reference skills (P3, the long tail)

All follow the **NEW SKILL DoD**. Group commits per plugin. Each row: skill name, plugin, shape, the canonical source(s) to WebFetch and cite. Where a critic from Phase 1 already exists, add the new skill to that critic's `skills:` if it belongs.

### Platform / language coverage skills
| Skill | Plugin | Shape | Canonical source |
|---|---|---|---|
|`kafka-consumer-tests`|qa-async-jobs|tool-wrapper|kafka.apache.org/documentation; Testcontainers Kafka module|
|`azure-functions-test`|qa-serverless|tool-wrapper|learn.microsoft.com/azure/azure-functions + Core Tools|
|`dotnet-faketime`|qa-time-and-timezones|tool-wrapper|learn.microsoft.com TimeProvider/ISystemClock (.NET 8)|
|`memcached-tests`|qa-cache-testing|tool-wrapper|memcached.org wiki; AWS ElastiCache Memcached docs|
|`azuredevops-bug-workflow`|qa-defect-management|tool-wrapper|learn.microsoft.com/azure/devops/boards REST API|
|`cargo-audit-rust`|qa-sca|tool-wrapper|rustsec.org / cargo-audit README|
|`bundle-audit-ruby`|qa-sca|tool-wrapper|github.com/rubysec/bundler-audit|
|`eslint-security-rules`|qa-sast|tool-wrapper|eslint-plugin-security / no-unsanitized docs|
|`pmd-apex-rules`|qa-sast|tool-wrapper|pmd.github.io Apex ruleset|
|`solr-relevance-tests`|qa-search-relevance|tool-wrapper|solr.apache.org Ref Guide (Learning to Rank)|
|`pester-cli-testing`|qa-cli-tools|tool-wrapper|pester.dev docs|
|`trivy-config`|qa-iac|tool-wrapper|aquasecurity.github.io/trivy (config scanning)|
|`split-io-test`|qa-experimentation|tool-wrapper|help.split.io docs|
|`openfeature-sdk-testing`|qa-feature-flags|tool-wrapper|openfeature.dev docs|
|`tempo-trace-tests`|qa-distributed-tracing|tool-wrapper|grafana.com/docs/tempo (TraceQL)|
|`stomp-amqp-tests`|qa-realtime-protocols|tool-wrapper|stomp.github.io; rabbitmq.com AMQP 0-9-1|

### Build-an-X / reference skills (uncovered surfaces)
| Skill | Plugin | Shape | Canonical source |
|---|---|---|---|
|`subscription-billing-test-author`|qa-payment|build-an-X|stripe.com/docs/billing (trial/proration/dunning)|
|`outbox-pattern-test-author`|qa-saga-cqrs|build-an-X|microservices.io transactional outbox|
|`go-race-detector-workflow`|qa-concurrency|tool-wrapper|go.dev/doc/articles/race_detector; goleak|
|`mfa-flow-test-author`|qa-auth-flows|build-an-X|RFC 6238 (TOTP); WebAuthn L2 spec|
|`graphql-subscription-test-author`|qa-graphql|build-an-X|spec.graphql.org subscriptions; Apollo subscriptions|
|`graphql-complexity-limit-tester`|qa-graphql|tool-wrapper|graphql-cost-analysis / depth-limit docs|
|`grpc-interceptor-test-author`|qa-grpc|build-an-X|grpc.io interceptor docs|
|`otel-collector-config-tester`|qa-distributed-tracing|tool-wrapper|opentelemetry.io collector docs|
|`sse-load-test`|qa-realtime-protocols|tool-wrapper|HTML SSE spec; k6 SSE|
|`experiment-results-interpreter`|qa-experimentation|build-an-X|Kohavi/Tang/Xu (cite by ISBN); guardrail refs|
|`killswitch-test-author`|qa-feature-flags|build-an-X|platform kill-switch docs|
|`nuclei-dast`|qa-dast|tool-wrapper|projectdiscovery.io/nuclei|
|`zap-authenticated-scans`|qa-dast|build-an-X|OWASP ZAP authentication docs|
|`crash-triage-reference`|qa-fuzz-testing|reference|LLVM ASan/UBSan output docs|
|`sbom-diff`|qa-sbom|build-an-X|syft diff; CycloneDX diff|
|`vex-author`|qa-sbom|build-an-X|openvex spec|
|`iso27001-test-patterns`|qa-compliance|reference|ISO/IEC 27001:2022 Annex A (cite by ID)|
|`compliance-evidence-generator`|qa-compliance|build-an-X|SOC 2 / auditor evidence guidance|
|`k-anonymity-verifier`|qa-test-data-privacy|build-an-X|ARX / pycanon / SmartNoise docs|
|`test-data-governance-reference`|qa-test-data-privacy|reference|GDPR retention; NIST SP 800-122|
|`non-postgres-rls-reference`|qa-multi-tenancy|reference|MySQL/CockroachDB/Vitess isolation docs|
|`tenant-onboarding-test-author`|qa-multi-tenancy|build-an-X|AWS SaaS tenant-isolation whitepaper|
|`reachability-analyzer`|qa-sca|build-an-X|depcheck/vulture/cargo-machete docs|
|`latency-percentile-analyzer`|qa-load-testing|build-an-X|k6/Gatling result-model docs|
|`jvm-gc-tuning`|qa-load-testing|reference|OpenJDK GC tuning docs|
|`flake-dashboard-author`|qa-flake-triage|build-an-X|Grafana/Datadog CI dashboards|
|`flake-remediation-guide`|qa-flake-triage|build-an-X|maps each of the 8 `flake-pattern-reference` patterns to a fix|
|`chaos-results-reporter`|qa-chaos-resilience|build-an-X|Principles of Chaos|
|`steady-state-hypothesis-validator`|qa-chaos-resilience|build-an-X|Principles of Chaos|
|`rum-to-synthetic-gap-analyzer`|qa-shift-right|build-an-X|Datadog RUM / web-vitals docs|
|`bdd-suite-to-test-map`|qa-shift-left|build-an-X|Cucumber tag/coverage docs|
|`living-documentation-publisher`|qa-bdd|build-an-X|Pickles/Serenity docs|
|`pytest-asyncio-patterns`|qa-unit-tests-python|tool-wrapper|pytest-asyncio docs|
|`llm-regression-suite-author`|qa-llm-evaluation|build-an-X|golden-dataset eval guidance|
|`model-performance-regression-gate`|qa-ml-models|tool-wrapper|Deepchecks/Evidently CI gating|
|`judgment-list-author`|qa-search-relevance|build-an-X|TREC / quepid judgment guidance|
|`hybrid-search-eval-author`|qa-search-relevance|build-an-X|BM25+vector+reranker eval docs|
|`notebook-ci-pipeline-author`|qa-data-notebooks|build-an-X|papermill+nbval+testbook CI wiring|
|`game-perf-profiling`|qa-game|reference|Unity Profiler / Unreal Insights docs|
|`mobile-a11y-test-author`|qa-mobile-native|build-an-X|Apple VoiceOver / Android TalkBack testing docs|
|`secrets-baseline-manager`|qa-secrets|build-an-X|gitleaks/trufflehog/kingfisher baseline docs|
|`in-app-notification-test-author`|qa-notifications|build-an-X|WebSocket/Firebase RTDB docs|
|`onboarding-plan-author`|qa-hiring|build-an-X|—|

> This table is the authoritative P3 backlog. Add rows here if execution surfaces more. Each row → one skill task → one commit → host-plugin version bump.

**Phase 6 closeout** as Phase 1, run per-plugin so versions/CATALOG stay consistent.

---

## Phase 7 — Strategic: head-of-QA layer + junior on-ramp (P2)

### Task 7.1: Head-of-QA / portfolio quality layer
**Decision:** add to `qa-roles` (the org-chart plugin), not a new plugin.

- [ ] Create `plugins/qa-roles/agents/head-of-quality.md` — agent that aggregates **across teams/quarters**: composes single-team signals (consumes `qa-manager` output shape, `qa-okr-author`, release reports) into a portfolio quality roll-up + capacity view. Preloads `qa-okr-author` (qa-process). Trigger: "Use for a head-of-QA / director rolling up quality across multiple squads." NEW AGENT DoD.
- [ ] Update `qa-roles` plugin.json description (14 → 15 agents) and bump minor version.

### Task 7.2: Junior on-ramp convention
**Decision:** rather than one `qa-onboarding` plugin (which would overlap everything), add a short **`getting-started` pure-reference skill** to the highest-traffic discipline plugins that lack a junior entry point: `qa-web-e2e`, `qa-api-testing`, `qa-manual-testing`, `qa-load-testing`, `qa-bdd`. Each is a 1-screen "what this plugin is, the 3 skills to start with, and the first command to run." NEW SKILL DoD, shape = pure reference.

- [ ] Author 5 `getting-started` skills (one per listed plugin). Keep them genuinely useful (D5) — concrete first commands, not marketing.
- [ ] Bump those 5 plugins.

---

## Phase 8 — Global closeout (mandatory final task)

- [ ] **Step 1:** `bash scripts/test-validate.sh` then `bash scripts/validate.sh .` then `bash scripts/rating-check.sh .` then `python3 scripts/content-audit.py --strict` then `python3 scripts/composition-graph.py` — ALL must pass with zero MISSING edges.
- [ ] **Step 2:** `python3 scripts/version-bump-check.py` — every touched plugin bumped.
- [ ] **Step 3:** `python3 scripts/generate-catalog.py` — commit `CATALOG.md`. Confirm the new total component count.
- [ ] **Step 4:** Refresh the `77 plugins / N components` count string in `README.md`, `CLAUDE.md`, `docs/ROADMAP.md` "Current coverage snapshot," and `docs/PLUGIN_AUTHORING.md` if referenced.
- [ ] **Step 5:** Hand-update `docs/COMPOSITION.md` per-plugin subsections for every plugin whose agent→skill edges changed (it is NOT generated).
- [ ] **Step 5b:** Burn down the `readme_count_mismatch` backlog, then flip the lint from WARNING to CRITICAL in `scripts/content-audit.py`. As of Phase 0 the advisory backlog is **11 plugins** whose README component table != filesystem: `qa-cache-testing` (0/8), `qa-compatibility` (3/5), `qa-experimentation` (0/8), `qa-feature-flags` (0/8), `qa-graphql` (0/8), `qa-grpc` (0/7), `qa-multi-tenancy` (0/6), `qa-process` (20/25), `qa-roles` (0/14), `qa-test-environment` (6/5), `qa-web-e2e` (10/13). Most get a new component in Phases 1–6 (rebuild the README table then); fix the rest directly. The lint stays WARNING until all 77 pass, then promote.
- [ ] **Step 6:** Move every now-shipped component out of `docs/ROADMAP.md`'s gap lists (the ones this plan implemented) so the roadmap reflects reality.
- [ ] **Step 7:** In `testland-web`: run `npm run build` (re-runs `sync-plugins.mjs`) and confirm `[sync-plugins] counts match CATALOG.md`.
- [ ] **Step 8:** Final commit; push both repos only when the user asks (per workspace rule — commit and push are separate authorizations).

---

## Sequencing & parallelization

- **Phase 0 first, serially** (defects + the lint guardrail) — small, high-value, de-risks the rest.
- **Phases 1–6 are mostly independent per plugin** and are the natural unit for `superpowers:subagent-driven-development`: one subagent per component, two-stage review (spec compliance → quality), controller adjudicates. Components touching the SAME plugin must serialize their `plugin.json` version bump (do the bump once per plugin at its phase-closeout, not per component) to avoid merge churn.
- **Phase 7** after 1–6 (it references their outputs).
- **Phase 8 last**, once — CATALOG/COMPOSITION/counts reflect the final state.
- Do NOT batch a `git push` with a commit; push only when the user asks.

## Component count & version-bump map (fill during execution)
~21 (P1 critics) + 4 (P2 authors) + 4 (P3.3 manual) + 16 (P4 orchestrators) + 10 (P5 structural) + ~45 (P6 skills) + 6 (P7) ≈ **~106 new components** across ~60 plugins. Every plugin that gains/changes a component bumps its `plugin.json` version exactly once at its phase closeout. Track here:

| Plugin | Old ver | New ver | Components added |
|---|---|---|---|
| _(fill during execution)_ | | | |

---

## Self-review (run before execution)

1. **Spec coverage:** every review finding (relation defects §1, unifier gaps §2, structural §3, role coverage §4, docs §5) maps to a task — §1→Phase 0, §2→Phases 1/2/4, §3→Phases 5/6, §4 (head/junior/manual)→Phases 3/7, §5→Phase 0. ✔
2. **Placeholder scan:** the P3 table intentionally specifies *sources to fetch* rather than pre-written bodies — that is the authoring input, not a placeholder; the body is the implementer's deliverable graded by the rating gate. Acceptable for a markdown-component plan.
3. **Name consistency:** confirm each preloaded skill name against the real `skills/<name>/` directory before wiring (several names in the tables are best-guess from descriptions — the implementer reads the dir first; this is stated in each DoD).
4. **Gate, not pytest:** every task's verification is the validation pipeline, stated once in the shared DoD and reused. ✔
