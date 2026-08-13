# qa-visual-regression

Visual regression testing across Percy, Chromatic, Playwright snapshots, and Storybook visual tests, plus adversarial diff classification with a per-PR summary mode, baseline curation, and a binding CI baseline gate.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [percy-visual-regression-testing](skills/percy-visual-regression-testing/SKILL.md) | Author Percy snapshots via @percy/playwright/cypress/selenium/storybook; run with `percy exec`; review diffs in the Percy UI. |
| Skill | [chromatic-visual-regression-testing](skills/chromatic-visual-regression-testing/SKILL.md) | Run Chromatic on Storybook / Playwright / Cypress; configure baselines, TurboSnap, exit codes for CI gating. |
| Skill | [playwright-snapshots](skills/playwright-snapshots/SKILL.md) | Author `expect(page).toHaveScreenshot()` assertions; configure mask/clip/threshold/maxDiffPixels; manage per-OS / per-browser snapshot dirs and `--update-snapshots`; responsive breakpoint-matrix reference. |
| Skill | [storybook-visual-regression-testing](skills/storybook-visual-regression-testing/SKILL.md) | Wire visual regression into Storybook via @chromatic-com/storybook (hosted) or @storybook/test-runner postVisit + Playwright (self-hosted). |
| Skill | [visual-baseline-conventions](skills/visual-baseline-conventions/SKILL.md) | Reference catalog: engine selection, story/page/breakpoint coverage, mask/threshold/wait decision matrix, severity tiering, anti-patterns. |
| Skill | [visual-baseline-gate](skills/visual-baseline-gate/SKILL.md) | CI gate: aggregate diff classifications + acceptance log into a single go/no-go verdict; emit binding visual-gate.json + visual-gate.md artifacts; enforce author-cannot-self-approve. |
| Agent | [visual-diff-classifier](agents/visual-diff-classifier.md) | Adversarial reviewer of visual diffs: classify each as intentional / incidental / regression; per-PR summary-comment mode clusters 20+ diffs by component and intent. |
| Agent | [visual-baseline-curator](agents/visual-baseline-curator.md) | Builder: proposes a coverage-optimal initial baseline set, generates engine config files, runs a dry-run to verify the suite compiles. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-visual-regression@testland-qa
```
