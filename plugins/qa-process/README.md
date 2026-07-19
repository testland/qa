# qa-process

Test process + methodology - risk-based testing matrix + storming, Definition of Done, test strategy authoring, blameless post-mortems, release readiness gates, smoke-suite gating, test-pyramid analysis, TDD coaching for stuck patterns, E2E suite budgets, and test-case ideation from user stories.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [code-change-shape-classifier](skills/code-change-shape-classifier/SKILL.md) | Classifies a change set into pure-logic / service-layer / ui-heavy / data-heavy from path and content signals; computes the shape distribution over a history window and attaches the relative per-layer test cost model. |
| Skill | [definition-of-done](skills/definition-of-done/SKILL.md) | Pure-reference + checklist-generator for the team's Definition of Done (DoD) - explains the Scrum Guide's DoD definition (\"a formal desc... |
| Skill | [e2e-suite-budget](skills/e2e-suite-budget/SKILL.md) | Build-an-X workflow that caps the E2E suite size by computing flakiness ROI per test - for each E2E test, computes (regressions caught ×... |
| Skill | [framework-choice-advisor](skills/framework-choice-advisor/SKILL.md) | Pure reference catalog for picking a test automation framework - covers Playwright / Cypress / Selenium / WebdriverIO / Appium / Espresso... |
| Skill | [heuristic-test-design-coach](skills/heuristic-test-design-coach/SKILL.md) | Reference catalog of the four canonical heuristic test-design models - Bach's Heuristic Test Strategy Model (HTSM) with SFDPOT product el... |
| Skill | [post-mortem-author](skills/post-mortem-author/SKILL.md) | Build-an-X workflow that produces a blameless post-mortem from an incident - captures the timeline (chronological event sequence with sou... |
| Skill | [product-risk-register-builder](skills/product-risk-register-builder/SKILL.md) | Build-an-X workflow that produces a product-level risk register catalogue - per-feature / per-component product risks (functionality, per... |
| Skill | [project-risk-register-builder](skills/project-risk-register-builder/SKILL.md) | Build-an-X workflow that produces a project-level risk register - risks tied to the project execution (schedule slippage, environment ins... |
| Skill | [qa-okr-author](skills/qa-okr-author/SKILL.md) | Build-an-X workflow that drafts a QA team's quarterly OKR set - one to three Objectives, each with 3 - 5 measurable Key Results - from th... |
| Skill | [qa-vendor-evaluator](skills/qa-vendor-evaluator/SKILL.md) | Build-an-X workflow that produces a side-by-side **commercial-vendor** evaluation matrix for QA tools - test-management platforms (TestRa... |
| Skill | [risk-acceptance-decision-author](skills/risk-acceptance-decision-author/SKILL.md) | Build-an-X workflow that produces a structured risk-acceptance decision document - for risks the team has decided to accept (rather than... |
| Skill | [risk-coverage-mapper](skills/risk-coverage-mapper/SKILL.md) | Build-an-X workflow that produces a risk-to-test-coverage matrix - maps each risk in the product/release register to the tests / cases /... |
| Skill | [risk-matrix](skills/risk-matrix/SKILL.md) | Build-an-X workflow that produces a per-feature / per-release risk matrix - captures risks via a structured intake (feature → category →... |
| Skill | [risk-storming-facilitator](skills/risk-storming-facilitator/SKILL.md) | Build-an-X workflow for a risk-storming session - collaborative risk identification meeting where engineers brainstorm \"what could go wr... |
| Skill | [smoke-suite-gate](skills/smoke-suite-gate/SKILL.md) | Build-an-X workflow for a critical-path smoke suite that runs in <5 minutes - picks the 5-15 highest-business-value journeys (login, hero... |
| Skill | [tdd-stuck-pattern-resolver](skills/tdd-stuck-pattern-resolver/SKILL.md) | Pattern catalog for \"I can't write the test first\" moments - recognizes the common testability blockers (singletons / static dependenci... |
| Skill | [test-case-from-live-feature](skills/test-case-from-live-feature/SKILL.md) | Build-an-X workflow that produces a test-case matrix from a **live, undocumented feature** - running app at a URL, screen recording, scre... |
| Skill | [test-case-ideation-from-story](skills/test-case-ideation-from-story/SKILL.md) | Takes a user story or feature spec and emits a markdown test-case matrix - one row per case (id, title, precondition, steps, expected, ti... |
| Skill | [test-pyramid-balancer](skills/test-pyramid-balancer/SKILL.md) | Build-an-X workflow that analyzes a repo's test mix (unit / integration / E2E counts + runtimes) and recommends rebalancing toward Cohn's... |
| Skill | [test-strategy-author](skills/test-strategy-author/SKILL.md) | Build-an-X workflow that produces a test strategy document for a project / release / feature - covers scope, in/out, test types per layer... |
| Skill | [tool-selection-decision-record](skills/tool-selection-decision-record/SKILL.md) | Output contract for recording a chosen tool: observed signal, one primary recommendation, rationale naming the rejected alternative, and the mandatory conditions that would flip the choice. |
| Agent | [release-readiness-checker](agents/release-readiness-checker.md) | Builder/scaffolder agent that runs a configurable gate suite before a release - reads `release-readiness.yml` (which defines the gates: s... |
| Agent | [risk-assessment-critic](agents/risk-assessment-critic.md) | Adversarial agent that audits a risk register (product or release) for assessment quality. |
| Agent | [risk-based-test-planner](agents/risk-based-test-planner.md) | Action-taking strategic planner - given a feature scope or change initiative + the risk matrix, applies risk-based prioritization to choo... |
| Agent | [risk-based-test-selector](agents/risk-based-test-selector.md) | Action-taking agent that picks the subset of tests to run for a specific change set, weighted by the risk matrix - reads the PR's diff, i... |
| Agent | [risk-matrix-recommender](agents/risk-matrix-recommender.md) | Read-only specialist that ingests an existing risk matrix (per `risk-matrix`) plus historical CI + defect data and recommends data-inform... |
| Agent | [risk-storming-session-runner](agents/risk-storming-session-runner.md) | Action-taking orchestrator that runs a three-amigos risk-storming session end to end - structured prompts drive collaborative risk identi... |
| Agent | [test-case-quality-auditor](agents/test-case-quality-auditor.md) | Adversarial reviewer for test **cases** (not test code) - reads a TestRail / Qase / Xray export (CSV / JSON / API) or a markdown matrix p... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-process@testland-qa
```
