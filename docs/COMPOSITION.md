# Composition graph - agent → skill preloads

This document maps every agent's `skills:` preload list. It is
generated from the agent files by `scripts/ts/composition-graph.ts`
(`npm run catalog`); do not edit it by hand.

## Scope

- **329 skills** across 67 plugins.
- **73 agents** across 50 plugins.
- **71 agents** preload one or more skills (~97%).
- **2 agents** carry their own context inline (no preloads).
- **18 cross-plugin preload edges** (see §"Cross-plugin preload edges" below).

## How preloading works

A Claude Code agent file may declare:

```yaml
---
name: my-agent
description: ...
tools: Read, Bash(jq *)
skills:
  - skill-a
  - skill-b
---
```

When the agent is dispatched, the bodies of `skill-a` and `skill-b`
are loaded into the agent's context before the agent body runs.
This lets agents stay short (~30-60 lines) while reusing reference
material that lives in skills.

## Per-plugin preload map

Skills owned by another plugin are marked with that plugin in italics.

### qa-accessibility

| Agent | Preloads |
|---|---|
| `accessibility-code-critic` | `wcag-keyboard-navigation`, `wcag-color-contrast`, `aria-authoring-patterns`, `screen-reader-test-author` |

### qa-ai-assisted

| Agent | Preloads |
|---|---|
| `ai-test-curator` | `test-code-conventions` *(qa-test-review)* |
| `ai-test-shallow-coverage-critic` | `test-code-conventions` *(qa-test-review)* |

### qa-api-testing

| Agent | Preloads |
|---|---|
| `api-test-author` | `postman-collections`, `restassured-testing`, `karate-testing`, `schemathesis-fuzzing`, `restler-fuzzing`, `api-chaos-runner`, `pairwise-test-case-generator` *(qa-test-data)* |

### qa-async-jobs

| Agent | Preloads |
|---|---|
| `async-job-health-critic` | `idempotency-test-author`, `cron-job-test-author` |

### qa-auth-flows

| Agent | Preloads |
|---|---|
| `token-storage-security-critic` | `session-management-test-author`, `oauth-flow-test-author` |

### qa-bdd

| Agent | Preloads |
|---|---|
| `bdd-scenario-author` | `gherkin-from-stories`, `bdd-step-library-curator` |
| `gherkin-style-reviewer` | _none: context inline_ |

### qa-browser-extension

| Agent | Preloads |
|---|---|
| `extension-test-author` | `playwright-extension-fixtures`, `chrome-extension-messaging-tests` |

### qa-bug-repro

| Agent | Preloads |
|---|---|
| `bug-report-from-recording` | `bug-report-template` |
| `bug-repro-builder` | `bug-report-template` |
| `defect-pipeline-runner` | `bug-report-template`, `defect-escape-taxonomy` |

### qa-cache-testing

| Agent | Preloads |
|---|---|
| `cache-key-collision-detector` | `redis-cache-tests`, `cache-key-discriminator-audit` |

### qa-ci-integration

| Agent | Preloads |
|---|---|
| `ci-pipeline-health-critic` | `ci-test-job-conventions`, `github-actions-test-jobs`, `gitlab-ci-test-jobs`, `jenkinsfile-test-stages` |

### qa-code-quality

| Agent | Preloads |
|---|---|
| `code-quality-critic` | `sonarqube-maintainability-gate`, `lizard-complexity`, `madge-deps`, `knip-dead-code` |

### qa-concurrency

| Agent | Preloads |
|---|---|
| `concurrency-critic` | `race-condition-test-author`, `deadlock-detection-harness` |

### qa-contract-testing

| Agent | Preloads |
|---|---|
| `contract-drift-investigator` | `pact-contract-testing`, `openapi-contract-diff`, `graphql-schema-regression`, `protobuf-compat-checking` |
| `contract-test-scaffolder` | `pact-contract-testing`, `openapi-contract-diff`, `graphql-schema-regression`, `protobuf-compat-checking` |

### qa-data-quality

| Agent | Preloads |
|---|---|
| `data-anomaly-triager` | `dbt-testing`, `great-expectations`, `soda-checks` |
| `schema-diff-reviewer` | `dbt-testing` |

### qa-db-migrations

| Agent | Preloads |
|---|---|
| `migration-blast-radius-reviewer` | `flyway-migrations`, `liquibase-migrations`, `atlas-migrations`, `migration-operation-taxonomy` |

### qa-defect-management

| Agent | Preloads |
|---|---|
| `ci-defect-filer` | `bug-report-template` *(qa-bug-repro)*, `bug-tracker-workflow` |
| `defect-fix-verifier` | `bug-tracker-workflow`, `confirmation-testing-workflow` |

### qa-desktop

| Agent | Preloads |
|---|---|
| `desktop-test-author` | `flaui-tests`, `winappdriver`, `electron-playwright`, `qt-test-framework`, `xcuitest-suite` *(qa-mobile)*, `desktop-test-strategy-reference`, `dotnet-unit-tests` *(qa-unit-tests-net)* |

### qa-distributed-tracing

| Agent | Preloads |
|---|---|
| `trace-coverage-reviewer` | `opentelemetry-trace-assertions`, `jaeger-trace-tests`, `trace-spec-author` |

### qa-embedded

| Agent | Preloads |
|---|---|
| `embedded-test-author` | `unity-test-framework-c`, `googletest-embedded-arm`, `ceedling-build-runner`, `qemu-system-test-runner`, `embedded-coverage-strategy-reference`, `hardware-in-loop-reference` |

### qa-feature-flags

| Agent | Preloads |
|---|---|
| `flag-coverage-gap-detector` | `openfeature-sdk-testing` |
| `sample-ratio-mismatch-detector` | `experiment-results-interpreter` |
| `stale-flag-detector` | `openfeature-sdk-testing` |

### qa-flake-triage

| Agent | Preloads |
|---|---|
| `e2e-flake-bisector` | `flake-pattern-reference`, `flaky-test-quarantine`, `flake-axis-bisection` |
| `regression-bisector` | `k6-load-testing` *(qa-load-testing)*, `lighthouse-perf` *(qa-load-testing)* |

### qa-fuzz-testing

| Agent | Preloads |
|---|---|
| `fuzz-target-author` | `coverage-guided-fuzzing` |

### qa-game

| Agent | Preloads |
|---|---|
| `game-test-scenario-author` | `unity-test-framework`, `unreal-automation-system`, `godot-gut-tests`, `multiplayer-state-machine-coverage`, `gameplay-recording-replay`, `platform-cert-overview-reference` |

### qa-grpc

| Agent | Preloads |
|---|---|
| `grpc-service-reviewer` | `grpc-mock`, `grpc-streaming-test-author`, `buf-cli-lint-breaking-build` |

### qa-iac

| Agent | Preloads |
|---|---|
| `terraform-plan-reviewer` | _none: context inline_ |

### qa-llm-evaluation

| Agent | Preloads |
|---|---|
| `llm-red-team-planner` | `giskard-llm`, `promptfoo-evaluation` |
| `prompt-eval-reviewer` | `promptfoo-evaluation`, `deepeval-evaluation`, `ragas-evaluation`, `giskard-llm`, `langfuse-tracing`, `llm-eval-anti-patterns` |

### qa-manual-testing

| Agent | Preloads |
|---|---|
| `test-script-quality-critic` | `manual-test-script-author` |

### qa-mobile

| Agent | Preloads |
|---|---|
| `mobile-test-author` | `appium-testing`, `detox-testing`, `espresso-suite`, `xcuitest-suite`, `maestro-flows`, `flutter-testing`, `pairwise-test-case-generator` *(qa-test-data)* |

### qa-multi-tenancy

| Agent | Preloads |
|---|---|
| `tenant-leak-critic` | `cross-tenant-data-leak-tests` |

### qa-notifications

| Agent | Preloads |
|---|---|
| `notification-delivery-critic` | `webhook-delivery-tester`, `mailpit-testing` |

### qa-payment

| Agent | Preloads |
|---|---|
| `payment-flow-critic` | `payment-flow-test-author`, `pci-dss-control-test-author` *(qa-compliance)* |

### qa-process

| Agent | Preloads |
|---|---|
| `quality-coach` | `definition-of-done` |
| `release-engineer` | `release-runbook-author` *(qa-shift-right)* |
| `release-readiness-checker` | `definition-of-done`, `smoke-suite-gate` |

### qa-property-based

| Agent | Preloads |
|---|---|
| `property-based-test-author` | `fast-check-testing`, `hypothesis-testing`, `jqwik-testing`, `proptest-testing` |
| `vacuous-property-critic` | `fast-check-testing`, `hypothesis-testing` |

### qa-pwa

| Agent | Preloads |
|---|---|
| `pwa-test-author` | `workbox-tests`, `web-push-tests`, `service-worker-lifecycle-tests`, `offline-fallback-tests`, `add-to-homescreen-flow-tests` |

### qa-realtime-protocols

| Agent | Preloads |
|---|---|
| `realtime-protocol-reviewer` | `websocket-tests`, `server-sent-events-tests`, `mqtt-tests`, `webhook-delivery-tester` *(qa-notifications)* |

### qa-saga-cqrs

| Agent | Preloads |
|---|---|
| `saga-critic` | `saga-transaction-tests`, `event-sourcing-tests` |

### qa-search-relevance

| Agent | Preloads |
|---|---|
| `relevance-regression-reviewer` | `elasticsearch-relevance-tests`, `vector-search-recall-tests` |

### qa-security-scanning

| Agent | Preloads |
|---|---|
| `security-finding-triager` | `multi-tool-finding-triage`, `cve-exploitability-triage`, `language-native-sast` |

### qa-serverless

| Agent | Preloads |
|---|---|
| `serverless-cold-start-critic` | `serverless-integration-test-builder` |

### qa-shift-right

| Agent | Preloads |
|---|---|
| `observability-to-test` | `synthetic-monitor-author` |

### qa-team-management

| Agent | Preloads |
|---|---|
| `qa-manager` | `quality-status-digest` |

### qa-test-data

| Agent | Preloads |
|---|---|
| `golden-file-manager` | `golden-file-conventions` |
| `test-data-setup-agent` | `synthetic-data-toolkit`, `seed-data-curator`, `faker-data` |

### qa-test-environment

| Agent | Preloads |
|---|---|
| `db-snapshot-restore` | `testcontainers`, `docker-compose-tests` |
| `test-environment-bootstrapper` | `testcontainers`, `docker-compose-tests`, `feature-flag-test-harness`, `playwright-fixture-builder` |

### qa-test-impact-analysis

| Agent | Preloads |
|---|---|
| `regression-suite-curator` | `regression-suite-selector`, `test-removal-criteria` |

### qa-test-management

| Agent | Preloads |
|---|---|
| `tcm-migration-agent` | `test-case-anatomy-reference`, `tcm-case-management` |
| `test-case-quality-critic` | `test-case-anatomy-reference`, `traceability-matrix-builder` |

### qa-test-reporting

| Agent | Preloads |
|---|---|
| `daily-test-suite-aggregator` | `junit-xml-analysis`, `allure-reports`, `coverage-diff-reporter`, `currents-integration`, `test-management-sync` |
| `release-quality-report-agent` | `test-run-summary-author`, `coverage-diff-reporter`, `test-coverage-targeter` |

### qa-test-review

| Agent | Preloads |
|---|---|
| `e2e-selector-quality-critic` | `test-code-conventions` |
| `framework-architecture-auditor` | `test-code-conventions`, `object-model-patterns`, `test-isolation-patterns`, `test-data-patterns` *(qa-test-data)*, `test-framework-architecture-audit` |
| `test-code-critic` | `test-code-conventions` |
| `test-suite-health-auditor` | `test-code-conventions`, `flake-pattern-reference` *(qa-flake-triage)*, `framework-choice-advisor` *(qa-process)*, `test-suite-health-audit` |

### qa-time

| Agent | Preloads |
|---|---|
| `time-handling-critic` | `dst-transition-reference` |

### qa-visual-regression

| Agent | Preloads |
|---|---|
| `visual-baseline-curator` | `percy-visual-regression-testing`, `chromatic-visual-regression-testing`, `playwright-snapshots`, `storybook-visual-regression-testing`, `visual-baseline-conventions` |
| `visual-diff-classifier` | `percy-visual-regression-testing`, `chromatic-visual-regression-testing`, `playwright-snapshots`, `visual-baseline-conventions` |

### qa-web-e2e

| Agent | Preloads |
|---|---|
| `automation-harness-bootstrapper` | `test-framework-blueprint` *(qa-test-review)*, `object-model-patterns` *(qa-test-review)* |
| `playwright-codegen-reviewer` | `test-code-conventions` *(qa-test-review)*, `cypress-testing` |

## Cross-plugin preload edges

Most agents preload skills from their own plugin. These 16 consumer and
producer pairs make up the 18 cross-plugin edges:

| Consumer | Producer | Skill | Why |
|---|---|---|---|
| `qa-ai-assisted/ai-test-curator` | `qa-test-review` | `test-code-conventions` | AI-generated tests are reviewed against the same hygiene catalog as human-authored ones. |
| `qa-ai-assisted/ai-test-shallow-coverage-critic` | `qa-test-review` | `test-code-conventions` | Shallow-coverage critic uses the same hygiene catalog as test-code-critic. |
| `qa-api-testing/api-test-author` | `qa-test-data` | `pairwise-test-case-generator` | Multi-input endpoint cases use the parameterized generator. |
| `qa-defect-management/ci-defect-filer` | `qa-bug-repro` | `bug-report-template` | Filing runs the from-CI-failure workflow of the bug report template. |
| `qa-desktop/desktop-test-author` | `qa-mobile` | `xcuitest-suite` | macOS desktop authoring uses the XCUITest skill (its references/macos.md carries the desktop delta). |
| `qa-desktop/desktop-test-author` | `qa-unit-tests-net` | `dotnet-unit-tests` | Desktop tests for .NET stacks compose into the xUnit / NUnit / MSTest umbrella idioms. |
| `qa-flake-triage/regression-bisector` | `qa-load-testing` | `k6-load-testing`, `lighthouse-perf` | Performance bisection uses k6 thresholds or LHCI assertions as the bad-commit signal. |
| `qa-mobile/mobile-test-author` | `qa-test-data` | `pairwise-test-case-generator` | Mobile parameterized-input scenarios use the language-agnostic generator. |
| `qa-payment/payment-flow-critic` | `qa-compliance` | `pci-dss-control-test-author` | PAN and CVV findings are graded against the PCI DSS scope rules that skill carries. |
| `qa-process/release-engineer` | `qa-shift-right` | `release-runbook-author` | The runbook conductor executes the six-phase runbook shape that skill owns. |
| `qa-realtime-protocols/realtime-protocol-reviewer` | `qa-notifications` | `webhook-delivery-tester` | Webhook receiver checks in the review follow the webhook delivery skill. |
| `qa-test-review/framework-architecture-auditor` | `qa-test-data` | `test-data-patterns` | Cross-framework audit covers fixture / data-factory patterns documented in qa-test-data. |
| `qa-test-review/test-suite-health-auditor` | `qa-flake-triage` | `flake-pattern-reference` | Per-layer flake-rate axis of the audit references the canonical flake-pattern catalog. |
| `qa-test-review/test-suite-health-auditor` | `qa-process` | `framework-choice-advisor` | Framework-misuse pattern detection consults the framework reference catalog. |
| `qa-web-e2e/automation-harness-bootstrapper` | `qa-test-review` | `test-framework-blueprint`, `object-model-patterns` | The scaffolder turns the blueprint's design decisions and the page-object contract into files. |
| `qa-web-e2e/playwright-codegen-reviewer` | `qa-test-review` | `test-code-conventions` | Codegen output is reviewed against the same selector / assertion hygiene rules. |

When a user installs a consumer plugin (e.g., `qa-process`), they
should also install the producer plugin (`qa-shift-right`) for the
preload to resolve. This is a **soft dependency**: the agent still
runs without the preload, but with degraded context.

## Validation

The composition graph is validated by `scripts/ts/composition-graph.ts`:

```bash
npm run compose
```

Exit code 0 means every preloaded skill name resolves to a real
SKILL.md somewhere in the marketplace. Exit code 1 surfaces missing
references.

## Regenerating this document

After any agent's `skills:` field changes, run `npm run catalog` and
commit this file with the agent change. CI fails while it is out of
date. A new cross-plugin preload also needs a one-line rationale in
`edgeWhy()` in `scripts/ts/composition-graph.ts`.

## References

- `docs/PLUGIN_AUTHORING.md` - agent body authoring guide
  (preload semantics).
- `docs/REVIEWER_CHECKLIST.md` - reviewer rubric (preload
  alignment is part of D5 Composability).
