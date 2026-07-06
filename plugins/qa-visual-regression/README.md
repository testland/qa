# qa-visual-regression

Visual regression testing across Percy, Chromatic, Playwright snapshots, Storybook visual tests, plus diff classification, baseline curation, and per-PR diff summarization.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [percy-visual-regression-testing](skills/percy-visual-regression-testing/SKILL.md) | Author Percy snapshots via @percy/playwright/cypress/selenium/storybook; run with `percy exec`; review diffs in the Percy UI. |
| Skill | [chromatic-visual-regression-testing](skills/chromatic-visual-regression-testing/SKILL.md) | Run Chromatic on Storybook / Playwright / Cypress; configure baselines, TurboSnap, exit codes for CI gating. |
| Skill | [playwright-snapshots](skills/playwright-snapshots/SKILL.md) | Author `expect(page).toHaveScreenshot()` assertions; configure mask/clip/threshold/maxDiffPixels; manage per-OS / per-browser snapshot dirs and `--update-snapshots`. |
| Skill | [storybook-visual-regression-testing](skills/storybook-visual-regression-testing/SKILL.md) | Wire visual regression into Storybook via @chromatic-com/storybook (hosted) or @storybook/test-runner postVisit + Playwright (self-hosted). |
| Skill | [responsive-breakpoint-runner](skills/responsive-breakpoint-runner/SKILL.md) | Dispatcher across viewport matrices for whichever engine the project uses; produces a single cross-breakpoint matrix report. |
| Skill | [visual-baseline-conventions](skills/visual-baseline-conventions/SKILL.md) | Reference catalog: engine selection, story/page/breakpoint coverage, mask/threshold/wait decision matrix, severity tiering, anti-patterns. |
| Agent | [visual-diff-classifier](agents/visual-diff-classifier.md) | Adversarial reviewer of visual diffs: classify each as intentional / incidental / regression; surfaces "looks intentional but isn't" cases that humans rubber-stamp. |
| Agent | [visual-baseline-curator](agents/visual-baseline-curator.md) | Builder: proposes a coverage-optimal initial baseline set, generates engine config files, runs a dry-run to verify the suite compiles. |
| Skill | [visual-baseline-gate](skills/visual-baseline-gate/SKILL.md) | CI gate: aggregate diff classifications + acceptance log into a single go/no-go verdict; enforce author-cannot-self-approve on baseline updates. |
| Agent | [visual-ci-gate-orchestrator](agents/visual-ci-gate-orchestrator.md) | Aggregates visual-diff-classifier verdicts via visual-baseline-gate into a single CI BLOCK/REVIEW/OK decision. |
| Skill | [visual-diff-summarizer](skills/visual-diff-summarizer/SKILL.md) | Build-an-X per-PR visual-diff summary across Percy / Chromatic / Playwright / Storybook; intent-based aligned / adjacent / unrelated clustering. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-visual-regression@testland-qa
```
