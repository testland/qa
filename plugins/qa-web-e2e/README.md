# qa-web-e2e

Web E2E framework wrappers (per-framework S1 skills). Full lifecycle per framework: author + run + traces + flake debug + CI integration. Plus two agents for codegen review and Selenium Grid orchestration.

## Components

| Type | Name | Archetype |
|---|---|---|
| Skill | [playwright-testing](skills/playwright-testing/SKILL.md) | S1 |
| Skill | [cypress-testing](skills/cypress-testing/SKILL.md) | S1 |
| Skill | [selenium-testing](skills/selenium-testing/SKILL.md) | S1 |
| Skill | [webdriverio-testing](skills/webdriverio-testing/SKILL.md) | S1 |
| Skill | [puppeteer-testing](skills/puppeteer-testing/SKILL.md) | S1 |
| Skill | [testcafe-testing](skills/testcafe-testing/SKILL.md) | S1 |
| Agent | [playwright-codegen-reviewer](agents/playwright-codegen-reviewer.md) | A3 |
| Agent | [selenium-grid-orchestrator](agents/selenium-grid-orchestrator.md) | A2 |
| Agent | [spec-to-e2e-test-scaffolder](agents/spec-to-e2e-test-scaffolder.md) | A4 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-web-e2e@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
