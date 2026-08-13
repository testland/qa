# qa-test-reporting

Test reporting + coverage analytics: per-format parsers (JUnit XML, LCOV + Cobertura, Allure), build-an-X PR reporters (coverage delta, run-summary narrative), the test-management-sync umbrella (TestRail / Xray / Zephyr) plus Currents analytics, per-language coverage analyzers (Jest, JaCoCo, coverage.py), and a risk-weighted coverage-targeting heuristic with a coverage debt ledger.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [junit-xml-analysis](skills/junit-xml-analysis/SKILL.md) | Parse JUnit-format XML; per-suite + per-case metrics; flaky vs new failure distinction via `<rerunFailure>` / `<flakyFailure>`; cross-run trend analysis. |
| Skill | [lcov-analysis](skills/lcov-analysis/SKILL.md) | Parse LCOV `.info` (per-file line / function / branch metrics; baseline diff + per-file gating) and Cobertura XML (coverage-04.dtd; cross-tool normalization) via references/cobertura.md. |
| Skill | [allure-reports](skills/allure-reports/SKILL.md) | Configure Allure adapter + CLI + history retention + `categories.json` failure classification + severity / epic / feature labels. |
| Skill | [coverage-diff-reporter](skills/coverage-diff-reporter/SKILL.md) | Build-an-X PR comment with per-file coverage delta vs main; sticky-comment update; new / regressed / improved / deleted classification. |
| Skill | [currents-integration](skills/currents-integration/SKILL.md) | Wire Currents.dev test analytics into Playwright (`@currents/playwright`); record-key + project-id config; trace / video / screenshot streaming. |
| Skill | [test-management-sync](skills/test-management-sync/SKILL.md) | Sync automated results to test management: vendor-independent push-results workflow with TestRail worked example; full TestRail / Xray / Zephyr Scale vendor specifics in references/. |
| Skill | [jest-coverage-analysis](skills/jest-coverage-analysis/SKILL.md) | Configure Jest `coverageProvider` (babel/v8), `coverageReporters` (lcov/cobertura/json/html), per-file `coverageThreshold`, `collectCoverageFrom`. |
| Skill | [jacoco-analysis](skills/jacoco-analysis/SKILL.md) | Configure JaCoCo for JVM; agent + report + check goals; six counters; rule structure (element / counter / value / minimum); LCOV / Cobertura conversion. |
| Skill | [coverage-py-analysis](skills/coverage-py-analysis/SKILL.md) | Configure coverage.py for Python; `coverage run` + `combine` for parallel; `.coveragerc` `source` / `omit` / `branch` / `fail_under`; xml / lcov / json / html output. |
| Skill | [test-coverage-targeter](skills/test-coverage-targeter/SKILL.md) | Build-an-X risk-weighted "what to test next" recommendation; cyclomatic complexity + churn for risk; pyramid layer for cost; top 5 - 10 targets; plus the weekly coverage debt ledger (falling / stale / orphan files). |
| Skill | [test-run-summary-author](skills/test-run-summary-author/SKILL.md) | Build-an-X narrative drafter: takes a JUnit / Allure / TestRail-API run + release context, emits status-update / release-notes / exec-summary / cross-run-trend markdown with a citation appendix. |
| Agent | [daily-test-suite-aggregator](agents/daily-test-suite-aggregator.md) | Action-taking: ingests CI artifacts across multiple suites and environments for a configurable window, emits a unified (suite × environment) cell-matrix roll-up plus comparison-to-yesterday for stand-up reading. |
| Agent | [release-quality-report-agent](agents/release-quality-report-agent.md) | Evidence-backed release go/no-go report (test-run summary + coverage diff + targets) for managers. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-reporting@testland-qa
```
