# qa-test-reporting

Test reporting + coverage analytics: per-format parsers (JUnit XML, LCOV, Cobertura, Allure), build-an-X PR reporters (coverage delta, WCAG compliance, visual-diff summary), commercial test-management integrations (Currents, TestRail, Xray, Zephyr), per-language coverage analyzers (Jest, JaCoCo, coverage.py), and a risk-weighted coverage-targeting heuristic.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [junit-xml-analysis](skills/junit-xml-analysis/SKILL.md) | S1 | Parse JUnit-format XML; per-suite + per-case metrics; flaky vs new failure distinction via `<rerunFailure>` / `<flakyFailure>`; cross-run trend analysis. |
| Skill | [lcov-analysis](skills/lcov-analysis/SKILL.md) | S1 | Parse LCOV `.info`; per-file line / function / branch metrics; baseline diff + per-file gating. |
| Skill | [cobertura-analysis](skills/cobertura-analysis/SKILL.md) | S1 | Parse Cobertura XML (coverage-04.dtd); per-class line + branch + complexity; cross-tool normalization. |
| Skill | [allure-reports](skills/allure-reports/SKILL.md) | S1 | Configure Allure adapter + CLI + history retention + `categories.json` failure classification + severity / epic / feature labels. |
| Skill | [coverage-diff-reporter](skills/coverage-diff-reporter/SKILL.md) | S3 | Build-an-X PR comment with per-file coverage delta vs main; sticky-comment update; new / regressed / improved / deleted classification. |
| Skill | [wcag-compliance-reporter](skills/wcag-compliance-reporter/SKILL.md) | S3 | Build-an-X per-page WCAG 2.2 conformance report; per-SC + per-level rollup; process completeness; "unknown" verdict for SCs no tool covers. |
| Skill | [visual-diff-summarizer](skills/visual-diff-summarizer/SKILL.md) | S3 | Build-an-X per-PR visual-diff summary across Percy / Chromatic / Playwright / Storybook; intent-based aligned / adjacent / unrelated clustering. |
| Skill | [extentreports](skills/extentreports/SKILL.md) | S1 | Configure ExtentReports v5 (`ExtentSparkReporter`) for Java / .NET; log levels, screenshots, hierarchical tests, categories. |
| Skill | [currents-integration](skills/currents-integration/SKILL.md) | S1 | Wire Currents.dev test analytics into Playwright (`@currents/playwright`); record-key + project-id config; trace / video / screenshot streaming. |
| Skill | [testrail-integration](skills/testrail-integration/SKILL.md) | S1 | Sync test runs / results to TestRail via `add_run` + batched `add_results_for_cases`; case-ID-in-test-name mapping; status convention. |
| Skill | [xray-integration](skills/xray-integration/SKILL.md) | S1 | Sync to Xray for Jira (Cloud / Server); JWT auth; `/api/v2/import/execution/{junit,cucumber,nunit,testng,robot}` endpoints; `@XrayTest(key=...)` mapping. |
| Skill | [zephyr-integration](skills/zephyr-integration/SKILL.md) | S1 | Sync to Zephyr Scale Cloud (post Squad/Enterprise variant disambiguation); Test Cycle + per-execution post; folder + label organization. |
| Skill | [jest-coverage-analysis](skills/jest-coverage-analysis/SKILL.md) | S1 | Configure Jest `coverageProvider` (babel/v8), `coverageReporters` (lcov/cobertura/json/html), per-file `coverageThreshold`, `collectCoverageFrom`. |
| Skill | [jacoco-analysis](skills/jacoco-analysis/SKILL.md) | S1 | Configure JaCoCo for JVM; agent + report + check goals; six counters; rule structure (element / counter / value / minimum); LCOV / Cobertura conversion. |
| Skill | [coverage-py-analysis](skills/coverage-py-analysis/SKILL.md) | S1 | Configure coverage.py for Python; `coverage run` + `combine` for parallel; `.coveragerc` `source` / `omit` / `branch` / `fail_under`; xml / lcov / json / html output. |
| Skill | [unit-test-coverage-targeter](skills/unit-test-coverage-targeter/SKILL.md) | S3 | Build-an-X risk-weighted "what to test next" recommendation; cyclomatic complexity + churn for risk; pyramid layer for cost; top 5–10 targets. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-reporting@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
